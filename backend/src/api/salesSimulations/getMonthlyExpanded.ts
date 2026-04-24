import { Router, Response } from 'express';
import {
  Project,
  SalesSimulationSnapshot,
} from '../../models';
import { optionalAuthenticate, AuthRequest } from '../../middleware/auth';
import { getProjectRole } from '../projects/utils';
import { formatZodError } from '../../utils/zodError';
import { YearMonthQuerySchema } from '../../schemas/salesSimulation';
import { calculateItemMetrics, getPreviousSnapshot } from '../../utils/salesSimulationHelper';

/**
 * @api {GET} /api/projects/:projectId/sales-simulations/monthly-expanded 月次売上シミュレーション取得（展開形式）
 * @description
 *   - 指定年月の売上シミュレーションデータをカテゴリ・アイテム展開形式で取得する
 *   - スナップショット（継承含む）が存在する場合はスナップショットのみを使用する（マスタ非参照）
 *   - スナップショットが一切存在しない場合のみ、マスタをゼロ値テンプレートとして使用する
 *   - viewer 以上の権限が必要
 *
 * @request
 *   Header:
 *   - Authorization: Bearer <token> (required)
 *   Path:
 *   - projectId: string (required) - プロジェクトID
 *   Query:
 *   - yearMonth: string (required) - 対象年月 (YYYY-MM形式)
 *   バリデーション失敗時:
 *   { success: false, code: 'invalid_query', message: エラー内容, data: null }
 *
 * @response
 *   成功時: { success: true, code: '', message: 'OK', data: { yearMonth, isInherited, categories, monthlyTotal, monthlyCost } }
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
 *       "yearMonth": "2026-01",
 *       "isInherited": false,
 *       "categories": [
 *         {
 *           "categoryId": "uuid",
 *           "categoryName": "1階物販",
 *           "categoryOrder": 0,
 *           "items": [
 *             {
 *               "itemId": "uuid",
 *               "itemName": "商品A",
 *               "itemOrder": 0,
 *               "unitPrice": 1000,
 *               "quantity": 50,
 *               "operatingDays": 25,
 *               "costRate": 40,
 *               "description": null,
 *               "calculationType": "daily",
 *               "monthlyQuantity": 0,
 *               "monthlySales": 1250000,
 *               "monthlyCost": 500000,
 *               "isInherited": false
 *             }
 *           ]
 *         }
 *       ],
 *       "monthlyTotal": 1250000,
 *       "monthlyCost": 500000
 *     }
 *   }
 *
 * @author copilot
 * @date 2026-04-23
 */
const router = Router({ mergeParams: true });

router.get('/monthly-expanded', optionalAuthenticate, async (req: AuthRequest, res: Response) => {
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

  const parsed = YearMonthQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      code: 'invalid_query',
      message: formatZodError(parsed.error),
      data: null,
    });
    return;
  }

  const { yearMonth } = parsed.data;

  // 指定月のスナップショットを検索
  let snapshot: SalesSimulationSnapshot | null = await SalesSimulationSnapshot.findOne({
    where: { project_id: projectId, year_month: yearMonth },
  });
  let isInherited = false;

  if (!snapshot) {
    snapshot = await getPreviousSnapshot(projectId, yearMonth);
    if (snapshot) {
      isInherited = true;
    }
  }

  let monthlyTotal = 0;
  let monthlyCost = 0;

  // スナップショットが存在する場合: スナップショットのみからカテゴリ・アイテムを構築する
  if (snapshot) {
    const categoryMap = new Map<string, {
      categoryId: string;
      categoryName: string;
      categoryOrder: number;
      items: Array<{
        itemId: string;
        itemName: string;
        itemOrder: number;
        unitPrice: number;
        quantity: number;
        operatingDays: number;
        costRate: number;
        description: string | null;
        calculationType: 'daily' | 'monthly';
        monthlyQuantity: number;
        monthlySales: number;
        monthlyCost: number;
        isInherited: boolean;
      }>;
    }>();

    for (const snapItem of snapshot.items_snapshot) {
      const { sales, cost } = calculateItemMetrics({
        unitPrice: snapItem.unitPrice,
        quantity: snapItem.quantity,
        operatingDays: snapItem.operatingDays,
        costRate: snapItem.costRate,
        calculationType: snapItem.calculationType ?? 'daily',
        monthlyQuantity: snapItem.monthlyQuantity ?? 0,
      });
      monthlyTotal += sales;
      monthlyCost += cost;

      if (!categoryMap.has(snapItem.categoryId)) {
        categoryMap.set(snapItem.categoryId, {
          categoryId: snapItem.categoryId,
          categoryName: snapItem.categoryName,
          categoryOrder: snapItem.categoryOrder,
          items: [],
        });
      }

      categoryMap.get(snapItem.categoryId)!.items.push({
        itemId: snapItem.itemId,
        itemName: snapItem.itemName,
        itemOrder: snapItem.itemOrder,
        unitPrice: snapItem.unitPrice,
        quantity: snapItem.quantity,
        operatingDays: snapItem.operatingDays,
        costRate: snapItem.costRate,
        description: snapItem.description ?? null,
        calculationType: snapItem.calculationType ?? 'daily',
        monthlyQuantity: snapItem.monthlyQuantity ?? 0,
        monthlySales: sales,
        monthlyCost: cost,
        isInherited,
      });
    }

    const categoryData = Array.from(categoryMap.values())
      .sort((a, b) => a.categoryOrder - b.categoryOrder)
      .map(cat => ({
        ...cat,
        items: cat.items.sort((a, b) => a.itemOrder - b.itemOrder),
      }));

    res.json({
      success: true,
      code: '',
      message: 'OK',
      data: { yearMonth, isInherited, categories: categoryData, monthlyTotal, monthlyCost },
    });
    return;
  }

  // スナップショットが一切存在しない場合: 空のカテゴリ一覧を返す
  res.json({
    success: true,
    code: '',
    message: 'OK',
    data: { yearMonth, isInherited: false, categories: [], monthlyTotal: 0, monthlyCost: 0 },
  });
});

export default router;
