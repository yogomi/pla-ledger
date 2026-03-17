import { Router, Response } from 'express';
import { Project, Permission, User } from '../../models';
import { authenticate, AuthRequest } from '../../middleware/auth';

/**
 * @api {GET} /api/projects/:id/permissions 権限一覧（Owner用）
 * @description
 *   - 指定プロジェクトの権限一覧（ユーザー情報付き）を取得する
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
 *   成功時: { success: true, code: '', message: '', data: { permissions } }
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
 *       "permissions": [
 *         {
 *           "id": "uuid",
 *           "user_id": "uuid",
 *           "role": "owner",
 *           "user": { "id": "uuid", "name": "Alice", "email": "alice@example.com" }
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

router.get('/:id/permissions', authenticate, async (req: AuthRequest, res: Response) => {
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
  const permissions = await Permission.findAll({
    where: { project_id: project.id },
    include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'] }],
  });
  res.json({ success: true, code: '', message: '', data: { permissions } });
});

export default router;
