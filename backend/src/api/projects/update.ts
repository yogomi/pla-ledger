import { Router, Response } from 'express';
import { Project, ProjectVersion, ActivityLog } from '../../models';
import { authenticate, AuthRequest } from '../../middleware/auth';
import { ProjectUpdateSchema } from '../../schemas';
import { getProjectRole } from './utils';

/**
 * @api {PUT} /api/projects/:id プロジェクト更新
 * @description
 *   - 指定IDのプロジェクトを更新する
 *   - owner または editor 権限が必要
 *   - 更新内容はバージョンスナップショットとして保存される
 *   - 認証が必要
 *
 * @request
 *   Header:
 *   - Authorization: Bearer <token> (required)
 *   Path:
 *   - id: string (required) - プロジェクトID
 *   Body (JSON): ProjectCreateSchemaの各フィールド（すべてoptional）
 *   - title: string (optional) - プロジェクト名
 *   - summary: string (optional) - 概要
 *   - visibility: 'public' | 'private' | 'unlisted' (optional) - 公開設定
 *   - currency: string (optional) - 通貨コード
 *   - stage: string (optional) - ステージ
 *   - tags: string[] (optional) - タグ一覧
 *   バリデーションはZodで行い、失敗時は
 *   { success: false, code: 'invalid_query', message: エラー内容, data: null }
 *
 * @response
 *   成功時: { success: true, code: '', message: 'Project updated', data: { projectId } }
 *   失敗時:
 *     - 400: { success: false, code: 'invalid_query', message: エラー内容, data: null }
 *     - 401: { success: false, code: 'unauthorized', message: 'No token provided', data: null }
 *     - 403: { success: false, code: 'forbidden', message: 'Edit permission required', data: null }
 *     - 404: { success: false, code: 'not_found', message: 'Project not found', data: null }
 *
 * @responseExample 成功例
 *   {
 *     "success": true,
 *     "code": "",
 *     "message": "Project updated",
 *     "data": { "projectId": "uuid" }
 *   }
 *
 * @responseExample 失敗例
 *   {
 *     "success": false,
 *     "code": "forbidden",
 *     "message": "Edit permission required",
 *     "data": null
 *   }
 *
 * @author yogomi
 * @date 2026-03-17
 */
const router = Router();

router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
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
  const role = await getProjectRole(project.id, req.user!.id);
  if (!role || role === 'viewer') {
    res.status(403).json({
      success: false,
      code: 'forbidden',
      message: 'Edit permission required',
      data: null,
    });
    return;
  }
  const parsed = ProjectUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      code: 'invalid_query',
      message: parsed.error.errors.map(e => e.message).join(', '),
      data: null,
    });
    return;
  }
  const updates = parsed.data;
  if (updates.visibility === 'public' && !project.published_at) {
    (updates as Record<string, unknown>)['published_at'] = new Date();
  }
  await project.update(updates);
  await ProjectVersion.create({
    project_id: project.id,
    snapshot: { ...project.toJSON() },
    summary: updates.summary ?? null,
    created_by: req.user!.id,
  });
  await ActivityLog.create({
    project_id: project.id,
    user_id: req.user!.id,
    action: 'project_updated',
    meta: {},
  });
  res.json({
    success: true,
    code: '',
    message: 'Project updated',
    data: { projectId: project.id },
  });
});

export default router;
