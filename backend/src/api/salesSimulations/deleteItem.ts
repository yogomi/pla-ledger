import { Router, Response } from 'express';
import { Project, SalesSimulationItem } from '../../models';
import { authenticate, AuthRequest } from '../../middleware/auth';
import { getProjectRole } from '../projects/utils';

/**
 * @api {DELETE} /api/projects/:projectId/sales-simulation-items/:itemId アイテム削除
 * @description
 *   - 売上シミュレーション用アイテムを削除する
 *   - editor 以上の権限が必要
 *
 * @request
 *   Header:
 *   - Authorization: Bearer <token> (required)
 *   Path:
 *   - projectId: string (required) - プロジェクトID
 *   - itemId: string (required) - アイテムID
 *
 * @response
 *   成功時: { success: true, code: '', message: 'Item deleted', data: null }
 *   失敗時:
 *     - 401: { success: false, code: 'unauthorized', message: 'No token provided', data: null }
 *     - 403: { success: false, code: 'forbidden', message: 'Edit permission required', data: null }
 *     - 404: { success: false, code: 'not_found', message: '...', data: null }
 *
 * @author copilot
 * @date 2026-03-18
 */
const router = Router({ mergeParams: true });

router.delete('/:itemId', authenticate, async (req: AuthRequest, res: Response) => {
  const { projectId, itemId } = req.params;

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

  const item = await SalesSimulationItem.findOne({
    where: { id: itemId, project_id: projectId },
  });
  if (!item) {
    res.status(404).json({
      success: false,
      code: 'not_found',
      message: 'Item not found',
      data: null,
    });
    return;
  }

  await item.destroy();

  res.json({ success: true, code: '', message: 'Item deleted', data: null });
});

export default router;
