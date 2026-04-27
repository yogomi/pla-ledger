import { Router, Response } from 'express';
import { Project, SalesSimulationSnapshot } from '../../models';
import { optionalAuthenticate, AuthRequest } from '../../middleware/auth';
import { getProjectRole } from '../projects/utils';
import { formatZodError } from '../../utils/zodError';
import { YearQuerySchema } from '../../schemas/salesSimulation';
import {
  calculateItemMetrics,
  getPreviousSnapshot,
} from '../../utils/salesSimulationHelper';

/**
 * @api {GET} /api/projects/:projectId/sales-simulations/yearly-items 品目別年次売上取得
 * @description
 *   - 指定年の1月〜12月の売上データを品目レベルで返す
 *   - カテゴリ・品目の構造は各月のスナップショットから導出する
 *   - 各月のスナップショットが存在しない場合は直前のスナップショットを継承する
 *   - viewer 以上の権限が必要
 *
 * @request
 *   Header:
 *   - Authorization: Bearer <token> (required)
 *   Path:
 *   - projectId: string (required)
 *   Query:
 *   - year: string (required) - 対象年 (YYYY形式)
 *
 * @response
 *   成功時: { success: true, code: '', message: 'OK', data: { year, categories } }
 *   categories[].items[].months は yearMonth ごとの monthlySales / monthlyCost を含む
 *
 * @author copilot
 * @date 2026-04-27
 */
const router = Router({ mergeParams: true });

router.get('/yearly-items', optionalAuthenticate, async (req: AuthRequest, res: Response) => {
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

  const role = await getProjectRole(projectId, req.user?.id);
  if (project.visibility !== 'public' && !role) {
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

  // 1月〜12月の各月スナップショットを取得する
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

  // 全月を通じてユニークなカテゴリと品目を収集する
  type CategoryMeta = { categoryName: string; categoryOrder: number };
  type ItemMeta = {
    itemName: string;
    itemOrder: number;
    categoryId: string;
  };
  const categoryMetaMap = new Map<string, CategoryMeta>();
  const itemMetaMap = new Map<string, ItemMeta>();

  for (const items of monthItemsMap.values()) {
    for (const item of items) {
      if (!categoryMetaMap.has(item.categoryId)) {
        categoryMetaMap.set(item.categoryId, {
          categoryName: item.categoryName,
          categoryOrder: item.categoryOrder,
        });
      }
      if (!itemMetaMap.has(item.itemId)) {
        itemMetaMap.set(item.itemId, {
          itemName: item.itemName,
          itemOrder: item.itemOrder,
          categoryId: item.categoryId,
        });
      }
    }
  }

  // カテゴリを order 順に並べる
  const sortedCategories = Array.from(categoryMetaMap.entries())
    .sort((a, b) => a[1].categoryOrder - b[1].categoryOrder);

  // 品目を categoryId でグループ化し、各品目の月次売上を計算する
  const yearMonths = Array.from(monthItemsMap.keys()).sort();

  const categories = sortedCategories.map(([categoryId, catMeta]) => {
    // このカテゴリに属する品目を itemOrder 順に並べる
    const sortedItems = Array.from(itemMetaMap.entries())
      .filter(([, meta]) => meta.categoryId === categoryId)
      .sort((a, b) => a[1].itemOrder - b[1].itemOrder);

    const items = sortedItems.map(([itemId, itemMeta]) => {
      const months = yearMonths.map(yearMonth => {
        const snapItems = monthItemsMap.get(yearMonth) ?? [];
        const snapItem = snapItems.find(s => s.itemId === itemId);
        if (!snapItem) {
          return { yearMonth, monthlySales: 0, monthlyCost: 0 };
        }
        const { sales, cost } = calculateItemMetrics({
          unitPrice: snapItem.unitPrice,
          quantity: snapItem.quantity,
          operatingDays: snapItem.operatingDays,
          costRate: snapItem.costRate,
          calculationType: snapItem.calculationType ?? 'daily',
          monthlyQuantity: snapItem.monthlyQuantity ?? 0,
        });
        return { yearMonth, monthlySales: sales, monthlyCost: cost };
      });

      const yearlyTotal = months.reduce((s, m) => s + m.monthlySales, 0);
      const yearlyCost = months.reduce((s, m) => s + m.monthlyCost, 0);

      return {
        itemId,
        itemName: itemMeta.itemName,
        months,
        yearlyTotal,
        yearlyCost,
      };
    });

    const categoryYearlyTotal = items.reduce((s, i) => s + i.yearlyTotal, 0);

    return {
      categoryId,
      categoryName: catMeta.categoryName,
      items,
      categoryYearlyTotal,
    };
  });

  res.json({
    success: true,
    code: '',
    message: 'OK',
    data: { year, categories },
  });
});

export default router;
