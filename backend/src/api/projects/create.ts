import { Router, Response } from 'express';
import {
  Project, Permission, ProjectSection, ProjectVersion, ActivityLog,
} from '../../models';
import { authenticate, AuthRequest } from '../../middleware/auth';
import { ProjectCreateSchema } from '../../schemas';

/**
 * @api {POST} /api/projects プロジェクト作成
 * @description
 *   - 新しいプロジェクトを作成する
 *   - 作成者にowner権限が付与される
 *   - デフォルトセクションとバージョンスナップショットが自動生成される
 *   - 認証が必要
 *
 * @request
 *   Header:
 *   - Authorization: Bearer <token> (required)
 *   Body (JSON):
 *   - title: string (required) - プロジェクト名
 *   - summary: string (optional) - 概要
 *   - visibility: 'public' | 'private' | 'unlisted' (required) - 公開設定
 *   - currency: string (required, 3-10文字) - 通貨コード 例: 'JPY'
 *   - stage: string (optional) - ステージ 例: 'idea', 'launch'
 *   - tags: string[] (optional) - タグ一覧
 *   - sections: Array<{ type: string, content: any }> (optional) - セクション一覧
 *   バリデーションはZodで行い、失敗時は
 *   { success: false, code: 'invalid_query', message: エラー内容, data: null }
 *
 * @response
 *   成功時: { success: true, code: '', message: 'Project created', data: { projectId } }
 *   失敗時:
 *     - 400: { success: false, code: 'invalid_query', message: エラー内容, data: null }
 *     - 401: { success: false, code: 'unauthorized', message: 'No token provided', data: null }
 *
 * @responseExample 成功例
 *   {
 *     "success": true,
 *     "code": "",
 *     "message": "Project created",
 *     "data": { "projectId": "uuid" }
 *   }
 *
 * @responseExample 失敗例
 *   {
 *     "success": false,
 *     "code": "invalid_query",
 *     "message": "Required",
 *     "data": null
 *   }
 *
 * @author yogomi
 * @date 2026-03-17
 */
const router = Router();

router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  const parsed = ProjectCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      code: 'invalid_query',
      message: parsed.error.errors.map(e => e.message).join(', '),
      data: null,
    });
    return;
  }
  const { title, summary, visibility, currency, stage, tags, sections } = parsed.data;
  const project = await Project.create({
    owner_id: req.user!.id,
    title,
    summary: summary ?? null,
    visibility,
    currency,
    stage: stage ?? null,
    tags: tags ?? [],
    published_at: visibility === 'public' ? new Date() : null,
  });
  await Permission.create({
    project_id: project.id,
    user_id: req.user!.id,
    role: 'owner',
    granted_by: null,
  });
  if (sections && sections.length > 0) {
    await Promise.all(sections.map(s => ProjectSection.create({
      project_id: project.id,
      type: s.type,
      content: s.content,
      created_by: req.user!.id,
    })));
  }
  await ProjectVersion.create({
    project_id: project.id,
    snapshot: { title, summary, visibility, currency, sections },
    summary: 'Initial version',
    created_by: req.user!.id,
  });
  await ActivityLog.create({
    project_id: project.id,
    user_id: req.user!.id,
    action: 'project_created',
    meta: { title },
  });
  res.status(201).json({
    success: true,
    code: '',
    message: 'Project created',
    data: { projectId: project.id },
  });
});

export default router;
