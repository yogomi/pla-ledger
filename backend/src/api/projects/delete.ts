import { Router, Response } from 'express';
import { Project, ActivityLog } from '../../models';
import { authenticate, AuthRequest } from '../../middleware/auth';

/**
 * @api {DELETE} /api/projects/:id プロジェクト削除
 * @description
 *   - 指定IDのプロジェクトを削除する
 *   - owner のみ実行可能
 *   - 認証が必要
 *
 * @request
 *   Header:
 *   - Authorization: Bearer <token> (required)
 *   Path:
 *   - id: string (required) - プロジェクトID
 *
 * @response
 *   成功時: { success: true, code: '', message: 'Project deleted', data: null }
 *   失敗時:
 *     - 401: { success: false, code: 'unauthorized', message: 'No token provided', data: null }
 *     - 403: { success: false, code: 'forbidden', message: 'Owner only', data: null }
 *     - 404: { success: false, code: 'not_found', message: 'Project not found', data: null }
 *
 * @responseExample 成功例
 *   {
 *     "success": true,
 *     "code": "",
 *     "message": "Project deleted",
 *     "data": null
 *   }
 *
 * @responseExample 失敗例
 *   {
 *     "success": false,
 *     "code": "forbidden",
 *     "message": "Owner only",
 *     "data": null
 *   }
 *
 * @author yogomi
 * @date 2026-03-17
 */
const router = Router();

router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  const project = await Project.findByPk(req.params['id']);
  if (!project) {
    res.status(404).json({
      success: false,
      code: 'not_found',
      message: 'Project not found',
      data: null,
    });
    return;
  }
  if (project.owner_id !== req.user!.id) {
    res.status(403).json({
      success: false,
      code: 'forbidden',
      message: 'Owner only',
      data: null,
    });
    return;
  }
  await project.destroy();
  await ActivityLog.create({
    project_id: null,
    user_id: req.user!.id,
    action: 'project_deleted',
    meta: { id: req.params['id'] },
  });
  res.json({ success: true, code: '', message: 'Project deleted', data: null });
});

export default router;
