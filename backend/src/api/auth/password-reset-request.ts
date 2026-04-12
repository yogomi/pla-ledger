import { Router, Response } from 'express';
import crypto from 'crypto';
import { User, PasswordResetToken } from '../../models';
import { PasswordResetRequestSchema } from '../../schemas';
import { formatZodError } from '../../utils/zodError';

/**
 * @api {POST} /api/auth/password-reset/request パスワードリセット申請
 * @description
 *   - メールアドレスを受け取り、該当ユーザーが存在すればリセットトークンを生成してメールを送信する
 *   - セキュリティ上、メールアドレスの存在有無に関わらず同一レスポンスを返す
 *   - トークンは crypto.randomBytes(32).toString('hex') で生成し、有効期限は1時間
 *   - メール送信は現時点では console.log で簡易実装（後で実際のメール送信機能に置き換え可）
 *   - レート制限：TODO: 同一IPから5分以内に3回まで（後で実装）
 *
 * @request
 *   Body (JSON):
 *   - email: string (required) - メールアドレス
 *   バリデーションはZodで行い、失敗時は
 *   { success: false, code: 'invalid_query', message: エラー内容, data: null }
 *
 * @response
 *   成功時: { success: true, code: '', message: 'If the email is registered, ...', data: null }
 *   失敗時:
 *     - 400: { success: false, code: 'invalid_query', message: エラー内容, data: null }
 *
 * @responseExample 成功例
 *   {
 *     "success": true,
 *     "code": "",
 *     "message": "If the email is registered, a reset link has been sent.",
 *     "data": null
 *   }
 *
 * @responseExample 失敗例
 *   {
 *     "success": false,
 *     "code": "invalid_query",
 *     "message": "email: Invalid email",
 *     "data": null
 *   }
 *
 * @author yogomi
 * @date 2026-04-12
 */
const router = Router();

router.post('/', async (req, res: Response) => {
  const parsed = PasswordResetRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      code: 'invalid_query',
      message: formatZodError(parsed.error),
      data: null,
    });
    return;
  }

  const { email } = parsed.data;
  const user = await User.findOne({ where: { email } });

  if (user) {
    const token = crypto.randomBytes(32).toString('hex');
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 60 * 60 * 1000); // 1時間後

    await PasswordResetToken.create({
      user_id: user.id,
      token,
      created_at: now,
      expires_at: expiresAt,
      used_at: null,
    });

    // TODO: 実際のメール送信機能に置き換える
    // セキュリティ: トークンをURLクエリパラメータに含めるのはパスワードリセットの標準的な方式。
    // ブラウザ履歴やサーバーログに残る可能性があるため、必ずHTTPS環境で使用すること。
    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password/confirm?token=${token}`;
    console.log(`[PasswordReset] Reset link for ${email}: ${resetLink}`);
  }

  // セキュリティ：メールアドレスの存在有無に関わらず同一レスポンスを返す
  res.json({
    success: true,
    code: '',
    message: 'If the email is registered, a reset link has been sent.',
    data: null,
  });
});

export default router;
