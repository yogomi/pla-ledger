import { Router, Response } from 'express';
import { Op } from 'sequelize';
import { PasswordResetToken } from '../../models';
import { z } from 'zod';
import { formatZodError } from '../../utils/zodError';

/**
 * @api {GET} /api/auth/password-reset/verify トークン検証
 * @description
 *   - クエリストリングのトークンを検証し、有効期限・未使用・DB存在確認を行う
 *   - 認証不要
 *
 * @request
 *   Query:
 *   - token: string (required) - リセットトークン
 *   バリデーションはZodで行い、失敗時は
 *   { success: false, code: 'invalid_query', message: エラー内容, data: null }
 *
 * @response
 *   有効時: { success: true, code: '', message: 'Token is valid.', data: { valid: true } }
 *   無効時: { success: false, code: 'invalid_token', message: 'The reset link is invalid or has expired.', data: null }
 *
 * @responseExample 成功例
 *   {
 *     "success": true,
 *     "code": "",
 *     "message": "Token is valid.",
 *     "data": { "valid": true }
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

const VerifyQuerySchema = z.object({
  token: z.string().min(1),
});

router.get('/', async (req, res: Response) => {
  const parsed = VerifyQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      code: 'invalid_query',
      message: formatZodError(parsed.error),
      data: null,
    });
    return;
  }

  const { token } = parsed.data;
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

  res.json({
    success: true,
    code: '',
    message: 'Token is valid.',
    data: { valid: true },
  });
});

export default router;
