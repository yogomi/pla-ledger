import { Router, Response } from 'express';
import { z } from 'zod';
import { Project, FixedAsset } from '../../models';
import { authenticate, AuthRequest } from '../../middleware/auth';
import { getProjectRole } from '../projects/utils';
import { formatZodError } from '../../utils/zodError';

const ParamsSchema = z.object({
  projectId: z.string().uuid(),
  assetId: z.string().uuid(),
});

/**
 * @api {DELETE} /api/projects/:projectId/fixed-assets/:assetId 固定資産削除
 * @description
 *   - 固定資産と関連する月次償却スケジュールを削除する
 *   - editor 以上の権限が必要
 *
 * @request
 *   Header:
 *   - Authorization: Bearer <token> (required)
 *   Path:
 *   - projectId: string (required)
 *   - assetId: string (required)
 *
 * @response
 *   成功時: { success: true, code: '', message: 'Fixed asset deleted successfully', data: null }
 *
 * @author yogomi
 * @date 2026-04-04
 */
const router = Router({ mergeParams: true });

router.delete('/:assetId', authenticate, async (req: AuthRequest, res: Response) => {
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
  const { projectId, assetId } = parsed.data;

  const project = await Project.findByPk(projectId);
  if (!project) {
    res.status(404).json({
      success: false, code: 'not_found', message: 'Project not found', data: null,
    });
    return;
  }

  const role = await getProjectRole(projectId, req.user!.id);
  if (!role || role === 'viewer') {
    res.status(403).json({
      success: false, code: 'forbidden', message: 'Edit permission required', data: null,
    });
    return;
  }

  const asset = await FixedAsset.findOne({
    where: { id: assetId, project_id: projectId },
  });
  if (!asset) {
    res.status(404).json({
      success: false, code: 'not_found', message: 'Fixed asset not found', data: null,
    });
    return;
  }

  // 関連する DepreciationSchedule は CASCADE 削除されるため、asset 削除のみで済む
  await asset.destroy();

  res.json({
    success: true,
    code: '',
    message: 'Fixed asset deleted successfully',
    data: null,
  });
});

export default router;
