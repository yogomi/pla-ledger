import { Router, Response } from 'express';
import { Op } from 'sequelize';
import { Project, Permission } from '../../models';
import { authenticate, AuthRequest } from '../../middleware/auth';

/**
 * @api {GET} /api/projects 自分のプロジェクト一覧
 * @description
 *   - ログインユーザーが権限を持つ全プロジェクト一覧を取得する
 *   - owner・editor・viewerいずれのロールでも取得対象となる
 *   - 認証が必要
 *
 * @request
 *   Header:
 *   - Authorization: Bearer <token> (required)
 *
 * @response
 *   成功時: { success: true, code: '', message: '', data: { projects } }
 *   失敗時:
 *     - 401: { success: false, code: 'unauthorized', message: 'No token provided', data: null }
 *
 * @responseExample 成功例
 *   {
 *     "success": true,
 *     "code": "",
 *     "message": "",
 *     "data": {
 *       "projects": [
 *         {
 *           "id": "uuid",
 *           "title": "My Project",
 *           "visibility": "private",
 *           "currency": "JPY",
 *           "tags": ["food", "restaurant"],
 *           "created_at": "2026-01-01T00:00:00.000Z"
 *         }
 *       ]
 *     }
 *   }
 *
 * @responseExample 失敗例
 *   {
 *     "success": false,
 *     "code": "unauthorized",
 *     "message": "No token provided",
 *     "data": null
 *   }
 *
 * @author yogomi
 * @date 2026-03-17
 */
const router = Router();

router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  const permissions = await Permission.findAll({ where: { user_id: req.user!.id } });
  const projectIds = permissions.map(p => p.project_id);
  const projects = await Project.findAll({
    where: { id: { [Op.in]: projectIds } },
    order: [['created_at', 'DESC']],
  });
  res.json({ success: true, code: '', message: '', data: { projects } });
});

export default router;
