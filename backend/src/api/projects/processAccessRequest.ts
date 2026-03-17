import { Router, Response } from 'express';
import { Project, AccessRequest, Permission } from '../../models';
import { authenticate, AuthRequest } from '../../middleware/auth';
import { ProcessAccessRequestSchema } from '../../schemas';

/**
 * @api {POST} /api/projects/:id/access-requests/:reqId アクセス申請処理（Owner用）
 * @description
 *   - アクセス申請を承認または却下する
 *   - 承認時は申請種別に応じて editor または viewer 権限が付与される
 *   - プロジェクトオーナーのみ実行可能
 *   - 認証が必要
 *
 * @request
 *   Header:
 *   - Authorization: Bearer <token> (required)
 *   Path:
 *   - id: string (required) - プロジェクトID
 *   - reqId: string (required) - アクセス申請ID
 *   Body (JSON):
 *   - action: 'approve' | 'reject' (required) - 処理内容
 *   バリデーションはZodで行い、失敗時は
 *   { success: false, code: 'invalid_query', message: エラー内容, data: null }
 *
 * @response
 *   成功時: { success: true, code: '', message: 'Request approved/rejected', data: null }
 *   失敗時:
 *     - 400: { success: false, code: 'invalid_query', message: エラー内容, data: null }
 *     - 401: { success: false, code: 'unauthorized', message: 'No token provided', data: null }
 *     - 403: { success: false, code: 'forbidden', message: 'Owner only', data: null }
 *     - 404: { success: false, code: 'not_found', message: 'Request not found', data: null }
 *
 * @responseExample 成功例
 *   {
 *     "success": true,
 *     "code": "",
 *     "message": "Request approved",
 *     "data": null
 *   }
 *
 * @responseExample 失敗例
 *   {
 *     "success": false,
 *     "code": "not_found",
 *     "message": "Request not found",
 *     "data": null
 *   }
 *
 * @author yogomi
 * @date 2026-03-17
 */
const router = Router();

router.post(
  '/:id/access-requests/:reqId',
  authenticate,
  async (req: AuthRequest, res: Response) => {
    const parsed = ProcessAccessRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        code: 'invalid_query',
        message: parsed.error.errors.map(e => e.message).join(', '),
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
    const ar = await AccessRequest.findByPk(req.params['reqId']);
    if (!ar || ar.project_id !== project.id) {
      res.status(404).json({
        success: false,
        code: 'not_found',
        message: 'Request not found',
        data: null,
      });
      return;
    }
    const { action } = parsed.data;
    await ar.update({
      status: action === 'approve' ? 'approved' : 'rejected',
      processed_by: req.user!.id,
      processed_at: new Date(),
    });
    if (action === 'approve') {
      const role = ar.request_type === 'edit' ? 'editor' : 'viewer';
      await Permission.upsert({
        project_id: project.id,
        user_id: ar.requester_id,
        role,
        granted_by: req.user!.id,
      });
    }
    res.json({
      success: true,
      code: '',
      message: `Request ${action}d`,
      data: null,
    });
  },
);

export default router;
