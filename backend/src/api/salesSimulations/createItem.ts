import { Router, Response } from 'express';
import { z } from 'zod';
import { Project, SalesSimulationCategory, SalesSimulationItem } from '../../models';
import { authenticate, AuthRequest } from '../../middleware/auth';
import { getProjectRole } from '../projects/utils';
import { formatZodError } from '../../utils/zodError';

const CreateItemSchema = z.object({
  categoryId: z.string().uuid(),
  itemName: z.string().min(1),
  itemOrder: z.number().int().min(0).optional(),
  unitPrice: z.number().min(0).optional(),
  quantity: z.number().min(0).optional(),
  operatingDays: z.number().min(0).optional(),
  costRate: z.number().min(0).max(100).optional(),
  description: z.string().nullable().optional(),
  calculationType: z.enum(['daily', 'monthly']).optional(),
  monthlyQuantity: z.number().min(0).optional(),
});

/**
 * @api {POST} /api/projects/:projectId/sales-simulation-items アイテム作成
 * @description
 *   - 売上シミュレーション用アイテムを指定カテゴリに新規作成する
 *   - editor 以上の権限が必要
 *
 * @request
 *   Header:
 *   - Authorization: Bearer <token> (required)
 *   Path:
 *   - projectId: string (required) - プロジェクトID
 *   Body (JSON):
 *   - categoryId: string (required) - カテゴリID
 *   - itemName: string (required) - アイテム名
 *   - itemOrder: number (optional) - 表示順序
 *   - unitPrice: number (optional) - 平均客単価
 *   - quantity: number (optional) - 客数（日）
 *   - operatingDays: number (optional) - 実施日数（月）
 *   - costRate: number (optional) - 原価率（0-100）
 *   - description: string | null (optional) - 備考
 *
 * @response
 *   成功時: { success: true, code: '', message: 'Item created', data: { item } }
 *   失敗時:
 *     - 400: { success: false, code: 'invalid_query', message: エラー内容, data: null }
 *     - 401: { success: false, code: 'unauthorized', message: 'No token provided', data: null }
 *     - 403: { success: false, code: 'forbidden', message: 'Edit permission required', data: null }
 *     - 404: { success: false, code: 'not_found', message: '...', data: null }
 *
 * @author copilot
 * @date 2026-03-18
 */
const router = Router({ mergeParams: true });

router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
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
  if (!role || role === 'viewer') {
    res.status(403).json({
      success: false,
      code: 'forbidden',
      message: 'Edit permission required',
      data: null,
    });
    return;
  }

  const parsed = CreateItemSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      code: 'invalid_query',
      message: formatZodError(parsed.error),
      data: null,
    });
    return;
  }

  const { categoryId, itemName, itemOrder, unitPrice, quantity, operatingDays, costRate,
    description, calculationType, monthlyQuantity } = parsed.data;

  // カテゴリの存在確認（同じプロジェクト配下のみ）
  const category = await SalesSimulationCategory.findOne({
    where: { id: categoryId, project_id: projectId },
  });
  if (!category) {
    res.status(404).json({
      success: false,
      code: 'not_found',
      message: 'Category not found',
      data: null,
    });
    return;
  }

  const item = await SalesSimulationItem.create({
    category_id: categoryId,
    project_id: projectId,
    item_name: itemName,
    item_order: itemOrder ?? 0,
    unit_price: unitPrice ?? 0,
    quantity: quantity ?? 0,
    operating_days: operatingDays ?? 0,
    cost_rate: costRate ?? 0,
    description: description ?? null,
    calculation_type: calculationType ?? 'daily',
    monthly_quantity: monthlyQuantity ?? 0,
  });

  res.status(201).json({
    success: true,
    code: '',
    message: 'Item created',
    data: { item },
  });
});

export default router;
