import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../../models';
import { ChangePasswordSchema } from '../../schemas';
import { formatZodError } from '../../utils/zodError';
import { authenticate, AuthRequest } from '../../middleware/auth';

/**
 * @api {POST} /api/auth/change-password パスワード変更
 * @description
 *   - 認証済みユーザーが現在のパスワードと新しいパスワードを送信してパスワードを変更する
 *   - 現在のパスワードが正しいことを確認した上で新しいパスワードに更新する
 *   - 認証必須（JWTミドルウェア）
 *
 * @request
 *   Body (JSON):
 *   - currentPassword: string (最小1文字、現在のパスワード)
 *   - newPassword: string (最小8文字、新しいパスワード)
 *   - バリデーション：Zodで型チェック
 *   - バリデーション失敗時: { success: false, code: 'invalid_query', message: 'エラー内容', data: null }
 *
 * @response
 *   - 成功時: { success: true, code: '', message: 'Password changed successfully', data: null }
 *   - 現在のパスワード不一致:
 *       { success: false, code: 'invalid_password', message: 'Current password is incorrect', data: null }
 *   - バリデーションエラー: { success: false, code: 'invalid_query', message: 'エラー内容', data: null }
 *
 * @responseExample 成功例
 *   {
 *     "success": true,
 *     "code": "",
 *     "message": "Password changed successfully",
 *     "data": null
 *   }
 *
 * @responseExample 失敗例（現在のパスワード不一致）
 *   {
 *     "success": false,
 *     "code": "invalid_password",
 *     "message": "Current password is incorrect",
 *     "data": null
 *   }
 *
 * @responseExample 失敗例（バリデーションエラー）
 *   {
 *     "success": false,
 *     "code": "invalid_query",
 *     "message": "newPassword: String must contain at least 8 character(s)",
 *     "data": null
 *   }
 *
 * @author yogomi
 * @date 2026-04-12
 */
const router = Router();

router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  const parsed = ChangePasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      code: 'invalid_query',
      message: formatZodError(parsed.error),
      data: null,
    });
    return;
  }

  const { currentPassword, newPassword } = parsed.data;

  const user = await User.findByPk(req.user!.id);
  if (!user) {
    res.status(404).json({
      success: false,
      code: 'not_found',
      message: 'User not found',
      data: null,
    });
    return;
  }

  const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
  if (!isMatch) {
    res.status(400).json({
      success: false,
      code: 'invalid_password',
      message: 'Current password is incorrect',
      data: null,
    });
    return;
  }

  const password_hash = await bcrypt.hash(newPassword, 12);
  await user.update({ password_hash });

  res.json({
    success: true,
    code: '',
    message: 'Password changed successfully',
    data: null,
  });
});

export default router;
