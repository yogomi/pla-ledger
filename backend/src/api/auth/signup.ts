import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { User, ActivityLog } from '../../models';
import { generateToken } from '../../middleware/auth';
import { SignupSchema } from '../../schemas';

/**
 * @api {POST} /api/auth/signup サインアップ
 * @description
 *   - 新規ユーザーを登録してJWTトークンを発行する
 *   - メールアドレスが既に登録済みの場合は409エラーを返す
 *
 * @request
 *   Body (JSON):
 *   - email: string (required) - メールアドレス
 *   - password: string (required, min 8文字) - パスワード
 *   - name: string (required) - 表示名
 *   - locale: 'en' | 'ja' (optional, default: 'en') - 言語設定
 *   バリデーションはZodで行い、失敗時は
 *   { success: false, code: 'invalid_query', message: エラー内容, data: null }
 *
 * @response
 *   成功時: { success: true, code: '', message: 'Account created', data: { token, user } }
 *   失敗時:
 *     - 400: { success: false, code: 'invalid_query', message: エラー内容, data: null }
 *     - 409: { success: false, code: 'email_taken', message: 'Email already registered', data: null }
 *
 * @responseExample 成功例
 *   {
 *     "success": true,
 *     "code": "",
 *     "message": "Account created",
 *     "data": {
 *       "token": "eyJ...",
 *       "user": { "id": "uuid", "email": "user@example.com", "name": "Alice", "locale": "en" }
 *     }
 *   }
 *
 * @responseExample 失敗例
 *   {
 *     "success": false,
 *     "code": "email_taken",
 *     "message": "Email already registered",
 *     "data": null
 *   }
 *
 * @author yogomi
 * @date 2026-03-17
 */
const router = Router();

router.post('/', async (req, res: Response) => {
  const parsed = SignupSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      code: 'invalid_query',
      message: parsed.error.errors.map(e => e.message).join(', '),
      data: null,
    });
    return;
  }
  const { email, password, name, locale } = parsed.data;
  const existing = await User.findOne({ where: { email } });
  if (existing) {
    res.status(409).json({
      success: false,
      code: 'email_taken',
      message: 'Email already registered',
      data: null,
    });
    return;
  }
  const password_hash = await bcrypt.hash(password, 10);
  const user = await User.create({ email, password_hash, name, locale });
  await ActivityLog.create({ user_id: user.id, action: 'signup', meta: { email } });
  const token = generateToken({ id: user.id, email: user.email, locale: user.locale });
  res.status(201).json({
    success: true,
    code: '',
    message: 'Account created',
    data: {
      token,
      user: { id: user.id, email: user.email, name: user.name, locale: user.locale },
    },
  });
});

export default router;
