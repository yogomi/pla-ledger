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
import { YearMonthQuerySchema } from '../../schemas/salesSimulation';
import { calculateItemMetrics, getPreviousSnapshot } from '../../utils/salesSimulationHelper';

/**
 * @api {GET} /api/projects/:projectId/sales-simulations/monthly-expanded 月次売上シミュレーション取得（展開形式）
 * @description
 *   - 指定年月の売上シミュレーションデータをカテゴリ・アイテム展開形式で取得する
 *   - 指定年月のスナップショットが存在しない場合、直前のスナップショットを継承する
 *   - スナップショットが一切存在しない場合、現在のアイテムマスタの値を使用する
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
 * @date 2026-06-01
 */
const router = Router({ mergeParams: true });

router.get('/monthly-expanded', authenticate, async (req: AuthRequest, res: Response) => {
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
    // 直前のスナップショットを継承
    snapshot = await getPreviousSnapshot(projectId, yearMonth);
    if (snapshot) {
      isInherited = true;
    }
  }

  // 現在のカテゴリ・アイテムマスタを取得
  const categories = await SalesSimulationCategory.findAll({
    where: { project_id: projectId },
    include: [{ model: SalesSimulationItem, as: 'items' }],
    order: [
      ['category_order', 'ASC'],
      [{ model: SalesSimulationItem, as: 'items' }, 'item_order', 'ASC'],
    ],
  });

  let monthlyTotal = 0;
  let monthlyCost = 0;

  const categoryData = categories.map(cat => {
    const items = (cat.get('items') as SalesSimulationItem[] | undefined) ?? [];
    const itemData = items.map(item => {
      let itemName = item.item_name;
      let unitPrice = Number(item.unit_price);
      let quantity = Number(item.quantity);
      let operatingDays = Number(item.operating_days);
      let costRate = Number(item.cost_rate);
      let description = item.description;
      let itemIsInherited = false;

      if (snapshot) {
        // スナップショット内の一致するアイテムを検索
        const snapItem = snapshot.items_snapshot.find(s => s.itemId === item.id);
        if (snapItem) {
          itemName = snapItem.itemName;
          unitPrice = snapItem.unitPrice;
          quantity = snapItem.quantity;
          operatingDays = snapItem.operatingDays;
          costRate = snapItem.costRate;
          description = snapItem.description ?? null;
          itemIsInherited = isInherited;
        }
      }

      const { sales, cost } = calculateItemMetrics({ unitPrice, quantity, operatingDays, costRate });
      monthlyTotal += sales;
      monthlyCost += cost;

      return {
        itemId: item.id,
        itemName,
        itemOrder: item.item_order,
        unitPrice,
        quantity,
        operatingDays,
        costRate,
        description,
        monthlySales: sales,
        monthlyCost: cost,
        isInherited: itemIsInherited,
      };
    });

    return {
      categoryId: cat.id,
      categoryName: cat.category_name,
      categoryOrder: cat.category_order,
      items: itemData,
    };
  });

  res.json({
    success: true,
    code: '',
    message: 'OK',
    data: {
      yearMonth,
      isInherited,
      categories: categoryData,
      monthlyTotal,
      monthlyCost,
    },
  });
});

export default router;
