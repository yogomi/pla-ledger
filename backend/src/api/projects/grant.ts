import { Router, Response } from 'express';
import { Project, Permission, ActivityLog } from '../../models';
import { authenticate, AuthRequest } from '../../middleware/auth';
import { GrantPermissionSchema } from '../../schemas';
import { formatZodError } from '../../utils/zodError';

/**
 * @api {POST} /api/projects/:id/grant 権限付与（Owner用）
 * @description
 *   - 指定ユーザーにプロジェクトへのアクセス権限を付与する
 *   - 既に権限がある場合は上書き（upsert）される
 *   - プロジェクトオーナーのみ実行可能
 *   - 認証が必要
 *
 * @request
 *   Header:
 *   - Authorization: Bearer <token> (required)
 *   Path:
 *   - id: string (required) - プロジェクトID
 *   Body (JSON):
 *   - user_id: string (required, UUID) - 権限付与対象のユーザーID
 *   - role: 'editor' | 'viewer' (required) - 付与するロール
 *   バリデーションはZodで行い、失敗時は
 *   { success: false, code: 'invalid_query', message: エラー内容, data: null }
 *
 * @response
 *   成功時: { success: true, code: '', message: 'Permission granted', data: null }
 *   失敗時:
 *     - 400: { success: false, code: 'invalid_query', message: エラー内容, data: null }
 *     - 401: { success: false, code: 'unauthorized', message: 'No token provided', data: null }
 *     - 403: { success: false, code: 'forbidden', message: 'Owner only', data: null }
 *
 * @responseExample 成功例
 *   {
 *     "success": true,
 *     "code": "",
 *     "message": "Permission granted",
 *     "data": null
 *   }
 *
 * @responseExample 失敗例
 *   {
 *     "success": false,
 *     "code": "invalid_query",
 *     "message": "Invalid uuid",
 *     "data": null
 *   }
 *
 * @author yogomi
 * @date 2026-03-17
 */
const router = Router();

router.post('/:id/grant', authenticate, async (req: AuthRequest, res: Response) => {
  const parsed = GrantPermissionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      code: 'invalid_query',
      message: formatZodError(parsed.error),
      data: null,
    });
    return;
  }
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
  const { user_id, role } = parsed.data;
  await Permission.upsert({
    project_id: project.id,
    user_id,
    role,
    granted_by: req.user!.id,
  });
  await ActivityLog.create({
    project_id: project.id,
    user_id: req.user!.id,
    action: 'permission_granted',
    meta: { user_id, role },
  });
  res.json({ success: true, code: '', message: 'Permission granted', data: null });
});

export default router;
