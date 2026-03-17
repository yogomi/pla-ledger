import { Router, Response } from 'express';
import { Project, AccessRequest } from '../../models';
import { authenticate, AuthRequest } from '../../middleware/auth';

/**
 * @api {GET} /api/projects/:id/access-requests アクセス申請一覧（Owner用）
 * @description
 *   - 指定プロジェクトへのアクセス申請一覧を取得する
 *   - プロジェクトオーナーのみ実行可能
 *   - 認証が必要
 *
 * @request
 *   Header:
 *   - Authorization: Bearer <token> (required)
 *   Path:
 *   - id: string (required) - プロジェクトID
 *
 * @response
 *   成功時: { success: true, code: '', message: '', data: { requests } }
 *   失敗時:
 *     - 401: { success: false, code: 'unauthorized', message: 'No token provided', data: null }
 *     - 403: { success: false, code: 'forbidden', message: 'Owner only', data: null }
 *
 * @responseExample 成功例
 *   {
 *     "success": true,
 *     "code": "",
 *     "message": "",
 *     "data": {
 *       "requests": [
 *         {
 *           "id": "uuid",
 *           "requester_id": "uuid",
 *           "request_type": "view",
 *           "message": null,
 *           "status": "pending",
 *           "created_at": "2026-01-01T00:00:00.000Z"
 *         }
 *       ]
 *     }
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

router.get('/:id/access-requests', authenticate, async (req: AuthRequest, res: Response) => {
  const project = await Project.findByPk(req.params['id']);
  if (!project || project.owner_id !== req.user!.id) {
    res.status(403).json({
      success: false,
      code: 'forbidden',
      message: 'Owner only',
      data: null,
    });
    return;
  }
  const requests = await AccessRequest.findAll({ where: { project_id: project.id } });
  res.json({ success: true, code: '', message: '', data: { requests } });
});

export default router;
