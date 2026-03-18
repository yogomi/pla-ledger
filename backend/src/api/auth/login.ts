import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { User, ActivityLog } from '../../models';
import { generateToken } from '../../middleware/auth';
import { LoginSchema } from '../../schemas';

/**
 * @api {POST} /api/auth/login ログイン
 * @description
 *   - メールアドレスとパスワードで認証してJWTトークンを発行する
 *   - 認証失敗時は401エラーを返す
 *
 * @request
 *   Body (JSON):
 *   - email: string (required) - メールアドレス
 *   - password: string (required) - パスワード
 *   バリデーションはZodで行い、失敗時は
 *   { success: false, code: 'invalid_query', message: エラー内容, data: null }
 *
 * @response
 *   成功時: { success: true, code: '', message: 'Logged in', data: { token, user } }
 *   失敗時:
 *     - 400: { success: false, code: 'invalid_query', message: エラー内容, data: null }
 *     - 401: { success: false, code: 'invalid_credentials', message: 'Invalid email or password', data: null }
 *
 * @responseExample 成功例
 *   {
 *     "success": true,
 *     "code": "",
 *     "message": "Logged in",
 *     "data": {
 *       "token": "eyJ...",
 *       "user": { "id": "uuid", "email": "user@example.com", "name": "Alice", "locale": "en" }
 *     }
 *   }
 *
 * @responseExample 失敗例
 *   {
 *     "success": false,
 *     "code": "invalid_credentials",
 *     "message": "Invalid email or password",
 *     "data": null
 *   }
 *
 * @author yogomi
 * @date 2026-03-17
 */
const router = Router();

router.post('/', async (req, res: Response) => {
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      code: 'invalid_query',
      message: parsed.error.errors.map(e => e.message).join(', '),
      data: null,
    });
    return;
  }
  const { email, password } = parsed.data;
  const user = await User.findOne({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    res.status(401).json({
      success: false,
      code: 'invalid_credentials',
      message: 'Invalid email or password',
      data: null,
    });
    return;
  }
  await ActivityLog.create({ user_id: user.id, action: 'login', meta: { email } });
  const token = generateToken({ id: user.id, email: user.email, locale: user.locale });
  res.json({
    success: true,
    code: '',
    message: 'Logged in',
    data: {
      token,
      user: { id: user.id, email: user.email, name: user.name, locale: user.locale },
    },
  });
});

export default router;
