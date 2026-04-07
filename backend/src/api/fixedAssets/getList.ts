import { Router, Response } from 'express';
import { z } from 'zod';
import { Project, FixedAsset } from '../../models';
import { authenticate, AuthRequest } from '../../middleware/auth';
import { getProjectRole } from '../projects/utils';
import { formatZodError } from '../../utils/zodError';
import { formatAsset } from './create';

const ParamsSchema = z.object({
  projectId: z.string().uuid(),
});

/**
 * @api {GET} /api/projects/:projectId/fixed-assets 固定資産一覧取得
 * @description
 *   - プロジェクトの固定資産一覧を取得する
 *   - viewer 以上の権限が必要
 *
 * @request
 *   Header:
 *   - Authorization: Bearer <token> (required)
 *   Path:
 *   - projectId: string (required)
 *
 * @response
 *   成功時: { success: true, code: '', message: 'Fixed assets retrieved successfully',
 *             data: { assets: [...] } }
 *
 * @author yogomi
 * @date 2026-04-04
 */
const router = Router({ mergeParams: true });

router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  const parsed = ParamsSchema.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      code: 'invalid_request',
      message: formatZodError(parsed.error),
      data: null,
    });
    return;
  }
  const { projectId } = parsed.data;

  const project = await Project.findByPk(projectId);
  if (!project) {
    res.status(404).json({
      success: false, code: 'not_found', message: 'Project not found', data: null,
    });
    return;
  }

  const role = await getProjectRole(projectId, req.user!.id);
  if (!role) {
    res.status(403).json({
      success: false, code: 'forbidden', message: 'View permission required', data: null,
    });
    return;
  }

  const assets = await FixedAsset.findAll({
    where: { project_id: projectId },
    order: [['purchase_date', 'ASC'], ['created_at', 'ASC']],
  });

  res.json({
    success: true,
    code: '',
    message: 'Fixed assets retrieved successfully',
    data: { assets: assets.map(formatAsset) },
  });
});

export default router;
