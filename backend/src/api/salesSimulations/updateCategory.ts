import { Router, Response } from 'express';
import { z } from 'zod';
import { Project, SalesSimulationCategory } from '../../models';
import { authenticate, AuthRequest } from '../../middleware/auth';
import { getProjectRole } from '../projects/utils';
import { formatZodError } from '../../utils/zodError';

const UpdateCategorySchema = z.object({
  categoryName: z.string().min(1).optional(),
  categoryOrder: z.number().int().min(0).optional(),
}).refine(data => data.categoryName !== undefined || data.categoryOrder !== undefined, {
  message: 'At least one of categoryName or categoryOrder is required',
});

/**
 * @api {PATCH} /api/projects/:projectId/sales-simulations/categories/:categoryId カテゴリ更新
 * @description
 *   - 売上シミュレーション用カテゴリの名称または優先度（表示順序）を更新する
 *   - editor 以上の権限が必要
 *
 * @request
 *   Header:
 *   - Authorization: Bearer <token> (required)
 *   Path:
 *   - projectId: string (required) - プロジェクトID
 *   - categoryId: string (required) - カテゴリID
 *   Body (JSON):
 *   - categoryName: string (optional) - カテゴリ名
 *   - categoryOrder: number (optional) - 表示順序（0以上の整数）
 *   ※ categoryName と categoryOrder の少なくとも一方は必須
 *   バリデーション失敗時:
 *   { success: false, code: 'invalid_query', message: エラー内容, data: null }
 *
 * @response
 *   成功時: { success: true, code: '', message: 'Category updated', data: { category } }
 *   失敗時:
 *     - 400: { success: false, code: 'invalid_query', message: エラー内容, data: null }
 *     - 401: { success: false, code: 'unauthorized', message: 'No token provided', data: null }
 *     - 403: { success: false, code: 'forbidden', message: 'Edit permission required', data: null }
 *     - 404: { success: false, code: 'not_found', message: '...', data: null }
 *
 * @responseExample 成功例
 *   {
 *     "success": true,
 *     "code": "",
 *     "message": "Category updated",
 *     "data": {
 *       "category": {
 *         "id": "uuid",
 *         "project_id": "uuid",
 *         "category_name": "1階物販",
 *         "category_order": 2
 *       }
 *     }
 *   }
 *
 * @responseExample 失敗例
 *   {
 *     "success": false,
 *     "code": "invalid_query",
 *     "message": "At least one of categoryName or categoryOrder is required",
 *     "data": null
 *   }
 *
 * @author copilot
 * @date 2026-03-18
 */
const router = Router({ mergeParams: true });

router.patch('/:categoryId', authenticate, async (req: AuthRequest, res: Response) => {
  const { projectId, categoryId } = req.params;

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

  const parsed = UpdateCategorySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      code: 'invalid_query',
      message: formatZodError(parsed.error),
      data: null,
    });
    return;
  }

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

  const { categoryName, categoryOrder } = parsed.data;
  if (categoryName !== undefined) {
    category.category_name = categoryName;
  }
  if (categoryOrder !== undefined) {
    category.category_order = categoryOrder;
  }
  await category.save();

  res.json({
    success: true,
    code: '',
    message: 'Category updated',
    data: { category },
  });
});

export default router;
