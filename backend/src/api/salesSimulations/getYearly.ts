import { Router, Response } from 'express';
import {
  Project,
  SalesSimulationCategory,
  SalesSimulationItem,
  SalesSimulationSnapshot,
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
 * @date 2026-04-01
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

  // 現在のカテゴリ・アイテムマスタを取得
  const categories = await SalesSimulationCategory.findAll({
    where: { project_id: projectId },
    include: [{ model: SalesSimulationItem, as: 'items' }],
    order: [
      ['category_order', 'ASC'],
      [{ model: SalesSimulationItem, as: 'items' }, 'item_order', 'ASC'],
    ],
  });

  // カテゴリごとの月次データを格納するマップ
  // { categoryId: { yearMonth: { monthlySales, monthlyCost } } }
  const categoryMonthlyMap = new Map<string, Map<string, { monthlySales: number; monthlyCost: number }>>();
  for (const cat of categories) {
    categoryMonthlyMap.set(cat.id, new Map());
  }

  // 月次合計を格納する配列
  const monthlyTotals: Array<{ yearMonth: string; totalSales: number; totalCost: number }> = [];

  // 1月〜12月の各月のデータを処理する
  for (let m = 1; m <= 12; m++) {
    const yearMonth = `${year}-${String(m).padStart(2, '0')}`;

    // 指定月のスナップショットを検索（なければ継承）
    let snapshot: SalesSimulationSnapshot | null = await SalesSimulationSnapshot.findOne({
      where: { project_id: projectId, year_month: yearMonth },
    });
    if (!snapshot) {
      snapshot = await getPreviousSnapshot(projectId, yearMonth);
    }

    let monthTotal = 0;
    let monthCost = 0;

    for (const cat of categories) {
      const items = (cat.get('items') as SalesSimulationItem[] | undefined) ?? [];
      let catSales = 0;
      let catCost = 0;

      for (const item of items) {
        let unitPrice = Number(item.unit_price);
        let quantity = Number(item.quantity);
        let operatingDays = Number(item.operating_days);
        let costRate = Number(item.cost_rate);
        let calculationType: 'daily' | 'monthly' = item.calculation_type ?? 'daily';
        let monthlyQuantity = Number(item.monthly_quantity ?? 0);

        if (snapshot) {
          const snapItem = snapshot.items_snapshot.find(s => s.itemId === item.id);
          if (snapItem) {
            unitPrice = snapItem.unitPrice;
            quantity = snapItem.quantity;
            operatingDays = snapItem.operatingDays;
            costRate = snapItem.costRate;
            calculationType = snapItem.calculationType ?? 'daily';
            monthlyQuantity = snapItem.monthlyQuantity ?? 0;
          }
        }

        const { sales, cost } = calculateItemMetrics(
          { unitPrice, quantity, operatingDays, costRate, calculationType, monthlyQuantity },
        );
        catSales += sales;
        catCost += cost;
      }

      categoryMonthlyMap.get(cat.id)!.set(yearMonth, { monthlySales: catSales, monthlyCost: catCost });
      monthTotal += catSales;
      monthCost += catCost;
    }

    monthlyTotals.push({ yearMonth, totalSales: monthTotal, totalCost: monthCost });
  }

  // カテゴリデータを整形する
  const categoryData = categories.map(cat => {
    const monthMap = categoryMonthlyMap.get(cat.id)!;
    const months = Array.from(monthMap.entries()).map(([yearMonth, data]) => ({
      yearMonth,
      monthlySales: data.monthlySales,
      monthlyCost: data.monthlyCost,
    }));
    const yearlyTotal = months.reduce((sum, m) => sum + m.monthlySales, 0);
    const yearlyCost = months.reduce((sum, m) => sum + m.monthlyCost, 0);
    return {
      categoryId: cat.id,
      categoryName: cat.category_name,
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
