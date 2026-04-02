import { Router, Response } from 'express';
import { Project, ProjectSection, User } from '../../models';
import { optionalAuthenticate, AuthRequest } from '../../middleware/auth';
import { getProjectRole } from './utils';

/**
 * @api {GET} /api/projects/:id プロジェクト取得
 * @description
 *   - 指定IDのプロジェクト詳細（セクション・添付ファイル・オーナー情報・ロール）を取得する
 *   - 公開プロジェクトは未認証でも閲覧可能
 *   - 非公開プロジェクトは権限を持つユーザーのみ閲覧可能
 *
 * @request
 *   Header:
 *   - Authorization: Bearer <token> (optional)
 *   Path:
 *   - id: string (required) - プロジェクトID
 *
 * @response
 *   成功時: { success: true, code: '', message: '', data: { project, owner, role } }
 *   失敗時:
 *     - 403: { success: false, code: 'forbidden', message: 'Access denied', data: null }
 *     - 404: { success: false, code: 'not_found', message: 'Project not found', data: null }
 *
 * @responseExample 成功例
 *   {
 *     "success": true,
 *     "code": "",
 *     "message": "",
 *     "data": {
 *       "project": { "id": "uuid", "title": "My Project", ... },
 *       "owner": { "id": "uuid", "name": "Alice", "email": "alice@example.com" },
 *       "role": "owner"
 *     }
 *   }
 *
 * @responseExample 失敗例
 *   {
 *     "success": false,
 *     "code": "not_found",
 *     "message": "Project not found",
 *     "data": null
 *   }
 *
 * @author yogomi
 * @date 2026-03-17
 */
const router = Router();

router.get('/:id', optionalAuthenticate, async (req: AuthRequest, res: Response) => {
  const project = await Project.findByPk(req.params['id'], {
    include: [
      { model: ProjectSection, as: 'sections' },
    ],
  });
  if (!project) {
    res.status(404).json({
      success: false,
      code: 'not_found',
      message: 'Project not found',
      data: null,
    });
    return;
  }
  const role = await getProjectRole(project.id, req.user?.id);
  if (project.visibility !== 'public' && !role) {
    res.status(403).json({
      success: false,
      code: 'forbidden',
      message: 'Access denied',
      data: null,
    });
    return;
  }
  const owner = await User.findByPk(project.owner_id, {
    attributes: ['id', 'name', 'email'],
  });
  res.json({ success: true, code: '', message: '', data: { project, owner, role } });
});

export default router;
