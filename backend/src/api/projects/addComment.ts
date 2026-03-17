import { Router, Response } from 'express';
import { z } from 'zod';
import { Project, Comment } from '../../models';
import { authenticate, AuthRequest } from '../../middleware/auth';
import { getProjectRole } from './utils';

const CommentBodySchema = z.object({
  body: z.string().min(1, 'body is required'),
});

/**
 * @api {POST} /api/projects/:id/comments コメント投稿
 * @description
 *   - 指定プロジェクトにコメントを投稿する
 *   - 公開プロジェクトは認証済みユーザーなら誰でも投稿可能
 *   - 非公開プロジェクトは権限を持つユーザーのみ投稿可能
 *   - 認証が必要
 *
 * @request
 *   Header:
 *   - Authorization: Bearer <token> (required)
 *   Path:
 *   - id: string (required) - プロジェクトID
 *   Body (JSON):
 *   - body: string (required) - コメント本文
 *   バリデーションはZodで行い、失敗時は
 *   { success: false, code: 'invalid_query', message: エラー内容, data: null }
 *
 * @response
 *   成功時: { success: true, code: '', message: 'Comment added', data: { comment } }
 *   失敗時:
 *     - 400: { success: false, code: 'invalid_query', message: エラー内容, data: null }
 *     - 401: { success: false, code: 'unauthorized', message: 'No token provided', data: null }
 *     - 403: { success: false, code: 'forbidden', message: 'Access denied', data: null }
 *     - 404: { success: false, code: 'not_found', message: 'Project not found', data: null }
 *
 * @responseExample 成功例
 *   {
 *     "success": true,
 *     "code": "",
 *     "message": "Comment added",
 *     "data": {
 *       "comment": {
 *         "id": "uuid",
 *         "author_id": "uuid",
 *         "body": "Great project!",
 *         "created_at": "2026-01-01T00:00:00.000Z"
 *       }
 *     }
 *   }
 *
 * @responseExample 失敗例
 *   {
 *     "success": false,
 *     "code": "invalid_query",
 *     "message": "body is required",
 *     "data": null
 *   }
 *
 * @author yogomi
 * @date 2026-03-17
 */
const router = Router();

router.post('/:id/comments', authenticate, async (req: AuthRequest, res: Response) => {
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
  if (!role && project.visibility !== 'public') {
    res.status(403).json({
      success: false,
      code: 'forbidden',
      message: 'Access denied',
      data: null,
    });
    return;
  }
  const parsed = CommentBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      code: 'invalid_query',
      message: parsed.error.errors.map(e => e.message).join(', '),
      data: null,
    });
    return;
  }
  const comment = await Comment.create({
    project_id: project.id,
    author_id: req.user!.id,
    body: parsed.data.body,
  });
  res.status(201).json({
    success: true,
    code: '',
    message: 'Comment added',
    data: { comment },
  });
});

export default router;
