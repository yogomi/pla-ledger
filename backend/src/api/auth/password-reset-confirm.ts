import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { Op } from 'sequelize';
import { User, PasswordResetToken } from '../../models';
import { PasswordResetConfirmSchema } from '../../schemas';
import { formatZodError } from '../../utils/zodError';

/**
 * @api {POST} /api/auth/password-reset/confirm パスワード再設定確定
 * @description
 *   - トークンと新パスワードを受け取り、パスワードを更新する
 *   - トークン再検証（有効期限、未使用）を行う
 *   - 新パスワードを bcrypt でハッシュ化（salt rounds: 12）して users テーブルを更新
 *   - トークンの used_at を現在時刻に更新する
 *   - 認証不要
 *
 * @request
 *   Body (JSON):
 *   - token: string (required) - リセットトークン
 *   - newPassword: string (required, min 8文字) - 新しいパスワード
 *   バリデーションはZodで行い、失敗時は
 *   { success: false, code: 'invalid_query', message: エラー内容, data: null }
 *
 * @response
 *   成功時: { success: true, code: '', message: 'Password has been reset successfully. ...', data: null }
 *   失敗時:
 *     - 400: { success: false, code: 'invalid_query', message: エラー内容, data: null }
 *     - 400: { success: false, code: 'invalid_token', message: '...', data: null }
 *
 * @responseExample 成功例
 *   {
 *     "success": true,
 *     "code": "",
 *     "message": "Password has been reset successfully. Please sign in with your new password.",
 *     "data": null
 *   }
 *
 * @responseExample 失敗例
 *   {
 *     "success": false,
 *     "code": "invalid_token",
 *     "message": "The reset link is invalid or has expired.",
 *     "data": null
 *   }
 *
 * @author yogomi
 * @date 2026-04-12
 */
const router = Router();

router.post('/', async (req, res: Response) => {
  const parsed = PasswordResetConfirmSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      code: 'invalid_query',
      message: formatZodError(parsed.error),
      data: null,
    });
    return;
  }

  const { token, newPassword } = parsed.data;
  const now = new Date();

  const resetToken = await PasswordResetToken.findOne({
    where: {
      token,
      expires_at: { [Op.gt]: now },
      used_at: null,
    },
  });

  if (!resetToken) {
    res.status(400).json({
      success: false,
      code: 'invalid_token',
      message: 'The reset link is invalid or has expired.',
      data: null,
    });
    return;
  }

  const user = await User.findByPk(resetToken.user_id);
  if (!user) {
    res.status(400).json({
      success: false,
      code: 'invalid_token',
      message: 'The reset link is invalid or has expired.',
      data: null,
    });
    return;
  }

  const password_hash = await bcrypt.hash(newPassword, 12);
  await user.update({ password_hash });
  await resetToken.update({ used_at: now });

  res.json({
    success: true,
    code: '',
    message: 'Password has been reset successfully. Please sign in with your new password.',
    data: null,
  });
});

export default router;
