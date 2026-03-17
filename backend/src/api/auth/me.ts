import { Router, Response } from 'express';
import { User } from '../../models';
import { authenticate, AuthRequest } from '../../middleware/auth';

/**
 * @api {GET} /api/auth/me ログインユーザー取得
 * @description
 *   - JWTトークンから認証済みユーザーの情報を取得する
 *   - 認証トークンが必須
 *
 * @request
 *   Header:
 *   - Authorization: Bearer <token> (required)
 *
 * @response
 *   成功時: { success: true, code: '', message: '', data: { user } }
 *   失敗時:
 *     - 401: { success: false, code: 'unauthorized', message: 'No token provided', data: null }
 *     - 404: { success: false, code: 'not_found', message: 'User not found', data: null }
 *
 * @responseExample 成功例
 *   {
 *     "success": true,
 *     "code": "",
 *     "message": "",
 *     "data": {
 *       "user": {
 *         "id": "uuid",
 *         "email": "user@example.com",
 *         "name": "Alice",
 *         "locale": "en",
 *         "created_at": "2026-01-01T00:00:00.000Z"
 *       }
 *     }
 *   }
 *
 * @responseExample 失敗例
 *   {
 *     "success": false,
 *     "code": "not_found",
 *     "message": "User not found",
 *     "data": null
 *   }
 *
 * @author yogomi
 * @date 2026-03-17
 */
const router = Router();

router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  const user = await User.findByPk(req.user!.id, {
    attributes: ['id', 'email', 'name', 'locale', 'created_at'],
  });
  if (!user) {
    res.status(404).json({
      success: false,
      code: 'not_found',
      message: 'User not found',
      data: null,
    });
    return;
  }
  res.json({ success: true, code: '', message: '', data: { user } });
});

export default router;
