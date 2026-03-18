import { Router, Response } from 'express';
import { z } from 'zod';
import { Project, SalesSimulationCategory } from '../../models';
import { authenticate, AuthRequest } from '../../middleware/auth';
import { getProjectRole } from '../projects/utils';
import { formatZodError } from '../../utils/zodError';

const CreateCategorySchema = z.object({
  categoryName: z.string().min(1),
  categoryOrder: z.number().int().min(0).optional(),
});

/**
 * @api {POST} /api/projects/:projectId/sales-simulation-categories カテゴリ作成
 * @description
 *   - 売上シミュレーション用カテゴリを新規作成する
 *   - editor 以上の権限が必要
 *
 * @request
 *   Header:
 *   - Authorization: Bearer <token> (required)
 *   Path:
 *   - projectId: string (required) - プロジェクトID
 *   Body (JSON):
 *   - categoryName: string (required) - カテゴリ名
 *   - categoryOrder: number (optional) - 表示順序（デフォルト: 0）
 *
 * @response
 *   成功時: { success: true, code: '', message: 'Category created', data: { category } }
 *   失敗時:
 *     - 400: { success: false, code: 'invalid_query', message: エラー内容, data: null }
 *     - 401: { success: false, code: 'unauthorized', message: 'No token provided', data: null }
 *     - 403: { success: false, code: 'forbidden', message: 'Edit permission required', data: null }
 *     - 404: { success: false, code: 'not_found', message: 'Project not found', data: null }
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

  const parsed = CreateCategorySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      code: 'invalid_query',
      message: formatZodError(parsed.error),
      data: null,
    });
    return;
  }

  const { categoryName, categoryOrder } = parsed.data;
  const category = await SalesSimulationCategory.create({
    project_id: projectId,
    category_name: categoryName,
    category_order: categoryOrder ?? 0,
  });

  res.status(201).json({
    success: true,
    code: '',
    message: 'Category created',
    data: { category },
  });
});

export default router;
