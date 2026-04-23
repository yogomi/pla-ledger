import { Router, Response } from 'express';
import { Op } from 'sequelize';
import {
  Project,
  SalesSimulationSnapshot,
  CashFlowMonthly,
} from '../../models';
import { authenticate, AuthRequest } from '../../middleware/auth';
import { getProjectRole } from '../projects/utils';
import { formatZodError } from '../../utils/zodError';
import { YearQuerySchema } from '../../schemas/salesSimulation';
import {
  calculateItemMetrics,
  getPreviousSnapshot,
} from '../../utils/salesSimulationHelper';

/**
 * @api {GET} /api/projects/:projectId/sales-simulations/yearly 年次売上シミュレーション取得
 * @description
 *   - 指定年の1月〜12月の売上データをカテゴリ別に集計して返す
 *   - カテゴリ構造はマスタではなく各月のスナップショットから導出する
 *   - 各月のスナップショットが存在しない場合、直前のスナップショットを継承する
 *   - viewer 以上の権限が必要
 *
 * @request
 *   Header:
 *   - Authorization: Bearer <token> (required)
 *   Path:
 *   - projectId: string (required) - プロジェクトID
 *   Query:
 *   - year: string (required) - 対象年 (YYYY形式)
 *   バリデーション失敗時:
 *   { success: false, code: 'invalid_query', message: エラー内容, data: null }
 *
 * @response
 *   成功時: { success: true, code: '', message: 'OK', data: { year, categories, monthlyTotals,
 *             yearlyTotal, yearlyCost } }
 *   失敗時:
 *     - 400: { success: false, code: 'invalid_query', message: エラー内容, data: null }
 *     - 401: { success: false, code: 'unauthorized', message: 'No token provided', data: null }
 *     - 403: { success: false, code: 'forbidden', message: 'View permission required', data: null }
 *     - 404: { success: false, code: 'not_found', message: 'Project not found', data: null }
 *
 * @responseExample 成功例
 *   {
 *     "success": true,
 *     "code": "",
 *     "message": "OK",
 *     "data": {
 *       "year": "2026",
 *       "categories": [
 *         {
 *           "categoryId": "uuid",
 *           "categoryName": "物販",
 *           "months": [
 *             { "yearMonth": "2026-01", "monthlySales": 1000000, "monthlyCost": 400000 }
 *           ],
 *           "yearlyTotal": 12000000,
 *           "yearlyCost": 4800000
 *         }
 *       ],
 *       "monthlyTotals": [
 *         { "yearMonth": "2026-01", "totalSales": 1500000, "totalCost": 600000 }
 *       ],
 *       "yearlyTotal": 18000000,
 *       "yearlyCost": 7200000
 *     }
 *   }
 *
 * @author copilot
 * @date 2026-04-23
 */
const router = Router({ mergeParams: true });

router.get('/yearly', authenticate, async (req: AuthRequest, res: Response) => {
  const { projectId } = req.params;

  const project = await Project.findByPk(projectId);
  if (!project) {
    res.status(404).json({
      success: false,
      code: 'not_found',
      message: 'Project not found',
      data: null,
    });
    return;
  }

  const role = await getProjectRole(projectId, req.user!.id);
  if (!role) {
    res.status(403).json({
      success: false,
      code: 'forbidden',
      message: 'View permission required',
      data: null,
    });
    return;
  }

  const parsed = YearQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      code: 'invalid_query',
      message: formatZodError(parsed.error),
      data: null,
    });
    return;
  }

  const { year } = parsed.data;

  // キャッシュフローメモを一括取得（N+1クエリ回避）
  const cashFlowRecords = await CashFlowMonthly.findAll({
    attributes: ['year_month', 'note_ja', 'note_en'],
    where: {
      project_id: projectId,
      year_month: { [Op.like]: `${year}-%` },
    },
  });
  const noteMap = new Map<string, { noteJa: string | null; noteEn: string | null }>(
    cashFlowRecords.map(r => [r.year_month, { noteJa: r.note_ja ?? null, noteEn: r.note_en ?? null }]),
  );

  // 1月〜12月の各月のスナップショットを取得してマップに格納する
  type SnapshotItem = SalesSimulationSnapshot['items_snapshot'][number];
  const monthItemsMap = new Map<string, SnapshotItem[]>();

  for (let m = 1; m <= 12; m++) {
    const yearMonth = `${year}-${String(m).padStart(2, '0')}`;
    let snapshot: SalesSimulationSnapshot | null = await SalesSimulationSnapshot.findOne({
      where: { project_id: projectId, year_month: yearMonth },
    });
    if (!snapshot) {
      snapshot = await getPreviousSnapshot(projectId, yearMonth);
    }
    monthItemsMap.set(yearMonth, snapshot?.items_snapshot ?? []);
  }

  // 全月のスナップショットからユニークなカテゴリを収集する
  const categoryInfoMap = new Map<string, { categoryName: string; categoryOrder: number }>();
  for (const items of monthItemsMap.values()) {
    for (const item of items) {
      if (!categoryInfoMap.has(item.categoryId)) {
        categoryInfoMap.set(item.categoryId, {
          categoryName: item.categoryName,
          categoryOrder: item.categoryOrder,
        });
      }
    }
  }

  // カテゴリを order 順に並べる
  const sortedCategories = Array.from(categoryInfoMap.entries())
    .sort((a, b) => a[1].categoryOrder - b[1].categoryOrder);

  // 月次合計と月別カテゴリ売上を計算する
  const monthlyTotals: Array<{
    yearMonth: string;
    totalSales: number;
    totalCost: number;
    noteJa: string | null;
    noteEn: string | null;
  }> = [];

  // categoryId -> yearMonth -> { monthlySales, monthlyCost }
  const categoryMonthlyMap = new Map<string, Map<string, { monthlySales: number; monthlyCost: number }>>();
  for (const [categoryId] of sortedCategories) {
    categoryMonthlyMap.set(categoryId, new Map());
  }

  for (let m = 1; m <= 12; m++) {
    const yearMonth = `${year}-${String(m).padStart(2, '0')}`;
    const items = monthItemsMap.get(yearMonth) ?? [];

    let totalSales = 0;
    let totalCost = 0;

    // カテゴリごとに集計する
    for (const [categoryId] of sortedCategories) {
      const catItems = items.filter(item => item.categoryId === categoryId);
      let catSales = 0;
      let catCost = 0;

      for (const snapItem of catItems) {
        const { sales, cost } = calculateItemMetrics({
          unitPrice: snapItem.unitPrice,
          quantity: snapItem.quantity,
          operatingDays: snapItem.operatingDays,
          costRate: snapItem.costRate,
          calculationType: snapItem.calculationType ?? 'daily',
          monthlyQuantity: snapItem.monthlyQuantity ?? 0,
        });
        catSales += sales;
        catCost += cost;
      }

      categoryMonthlyMap.get(categoryId)!.set(yearMonth, { monthlySales: catSales, monthlyCost: catCost });
      totalSales += catSales;
      totalCost += catCost;
    }

    const notes = noteMap.get(yearMonth) ?? { noteJa: null, noteEn: null };
    monthlyTotals.push({
      yearMonth, totalSales, totalCost,
      noteJa: notes.noteJa, noteEn: notes.noteEn,
    });
  }

  // カテゴリデータを整形する
  const categoryData = sortedCategories.map(([categoryId, catInfo]) => {
    const monthMap = categoryMonthlyMap.get(categoryId)!;
    const months = Array.from(monthMap.entries()).map(([yearMonth, data]) => ({
      yearMonth,
      monthlySales: data.monthlySales,
      monthlyCost: data.monthlyCost,
    }));
    const yearlyTotal = months.reduce((sum, m) => sum + m.monthlySales, 0);
    const yearlyCost = months.reduce((sum, m) => sum + m.monthlyCost, 0);
    return {
      categoryId,
      categoryName: catInfo.categoryName,
      months,
      yearlyTotal,
      yearlyCost,
    };
  });

  const yearlyTotal = monthlyTotals.reduce((sum, m) => sum + m.totalSales, 0);
  const yearlyCost = monthlyTotals.reduce((sum, m) => sum + m.totalCost, 0);

  res.json({
    success: true,
    code: '',
    message: 'OK',
    data: {
      year,
      categories: categoryData,
      monthlyTotals,
      yearlyTotal,
      yearlyCost,
    },
  });
});

export default router;
