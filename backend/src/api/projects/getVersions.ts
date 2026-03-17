import { Router, Response } from 'express';
import { Project, ProjectVersion } from '../../models';
import { optionalAuthenticate, AuthRequest } from '../../middleware/auth';
import { getProjectRole } from './utils';

/**
 * @api {GET} /api/projects/:id/versions バージョン一覧
 * @description
 *   - 指定プロジェクトのバージョン履歴一覧を取得する
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
 *   成功時: { success: true, code: '', message: '', data: { versions } }
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
 *       "versions": [
 *         {
 *           "id": "uuid",
 *           "created_by": "uuid",
 *           "summary": { "en": "Initial version", "ja": "初期バージョン" },
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
 *     "message": "Access denied",
 *     "data": null
 *   }
 *
 * @author yogomi
 * @date 2026-03-17
 */
const router = Router();

router.get('/:id/versions', optionalAuthenticate, async (req: AuthRequest, res: Response) => {
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
  const versions = await ProjectVersion.findAll({
    where: { project_id: project.id },
    order: [['created_at', 'DESC']],
  });
  res.json({ success: true, code: '', message: '', data: { versions } });
});

export default router;
