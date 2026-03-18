import { Router, Response } from 'express';
import { Project, AccessRequest } from '../../models';
import { authenticate, AuthRequest } from '../../middleware/auth';
import { RequestAccessSchema } from '../../schemas';
import { formatZodError } from '../../utils/zodError';

/**
 * @api {POST} /api/projects/:id/request-access アクセス申請
 * @description
 *   - 指定プロジェクトへのアクセスを申請する
 *   - 同一ユーザーによる重複申請（pending状態）は不可
 *   - 認証が必要
 *
 * @request
 *   Header:
 *   - Authorization: Bearer <token> (required)
 *   Path:
 *   - id: string (required) - プロジェクトID
 *   Body (JSON):
 *   - request_type: 'view' | 'edit' (required) - 申請種別
 *   - message: string (optional) - 申請メッセージ
 *   バリデーションはZodで行い、失敗時は
 *   { success: false, code: 'invalid_query', message: エラー内容, data: null }
 *
 * @response
 *   成功時: { success: true, code: '', message: 'Access requested', data: { requestId } }
 *   失敗時:
 *     - 400: { success: false, code: 'invalid_query', message: エラー内容, data: null }
 *     - 401: { success: false, code: 'unauthorized', message: 'No token provided', data: null }
 *     - 404: { success: false, code: 'not_found', message: 'Project not found', data: null }
 *     - 409: { success: false, code: 'already_requested', message: 'Access already requested', data: null }
 *
 * @responseExample 成功例
 *   {
 *     "success": true,
 *     "code": "",
 *     "message": "Access requested",
 *     "data": { "requestId": "uuid" }
 *   }
 *
 * @responseExample 失敗例
 *   {
 *     "success": false,
 *     "code": "already_requested",
 *     "message": "Access already requested",
 *     "data": null
 *   }
 *
 * @author yogomi
 * @date 2026-03-17
 */
const router = Router();

router.post('/:id/request-access', authenticate, async (req: AuthRequest, res: Response) => {
  const parsed = RequestAccessSchema.safeParse(req.body);
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
  if (!project) {
    res.status(404).json({
      success: false,
      code: 'not_found',
      message: 'Project not found',
      data: null,
    });
    return;
  }
  const existing = await AccessRequest.findOne({
    where: { project_id: project.id, requester_id: req.user!.id, status: 'pending' },
  });
  if (existing) {
    res.status(409).json({
      success: false,
      code: 'already_requested',
      message: 'Access already requested',
      data: null,
    });
    return;
  }
  const ar = await AccessRequest.create({
    project_id: project.id,
    requester_id: req.user!.id,
    request_type: parsed.data.request_type,
    message: parsed.data.message ?? null,
    status: 'pending',
  });
  res.status(201).json({
    success: true,
    code: '',
    message: 'Access requested',
    data: { requestId: ar.id },
  });
});

export default router;
