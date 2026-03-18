import { Router, Response } from 'express';
import { Op } from 'sequelize';
import { Project } from '../../models';
import { optionalAuthenticate, AuthRequest } from '../../middleware/auth';
import { SearchQuerySchema } from '../../schemas';

/**
 * @api {GET} /api/search プロジェクト検索
 * @description
 *   - 公開プロジェクトをタイトル・概要のキーワードで全文検索する
 *   - ページネーション対応
 *
 * @request
 *   Header:
 *   - Authorization: Bearer <token> (optional)
 *   Query:
 *   - q: string (required, min 1文字) - 検索キーワード
 *   - page: number (optional, default: 1) - ページ番号（1以上）
 *   - limit: number (optional, default: 20, max: 100) - 1ページあたりの件数
 *   バリデーションはZodで行い、失敗時は
 *   { success: false, code: 'invalid_query', message: エラー内容, data: null }
 *
 * @response
 *   成功時: { success: true, code: '', message: '', data: { total, page, limit, projects } }
 *   失敗時:
 *     - 400: { success: false, code: 'invalid_query', message: エラー内容, data: null }
 *
 * @responseExample 成功例
 *   {
 *     "success": true,
 *     "code": "",
 *     "message": "",
 *     "data": {
 *       "total": 5,
 *       "page": 1,
 *       "limit": 20,
 *       "projects": [ ... ]
 *     }
 *   }
 *
 * @responseExample 失敗例
 *   {
 *     "success": false,
 *     "code": "invalid_query",
 *     "message": "String must contain at least 1 character(s)",
 *     "data": null
 *   }
 *
 * @author yogomi
 * @date 2026-03-17
 */
const router = Router();

router.get('/', optionalAuthenticate, async (req: AuthRequest, res: Response) => {
  const parsed = SearchQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      code: 'invalid_query',
      message: parsed.error.errors.map(e => e.message).join(', '),
      data: null,
    });
    return;
  }
  const { q, page, limit } = parsed.data;
  const offset = (page - 1) * limit;

  const where: Record<string, unknown> = {
    visibility: 'public',
    [Op.or as unknown as string]: [
      { title: { [Op.like]: `%${q}%` } },
      { summary: { [Op.like]: `%${q}%` } },
    ],
  };

  const { count, rows } = await Project.findAndCountAll({
    where,
    limit,
    offset,
    order: [['created_at', 'DESC']],
  });
  res.json({
    success: true,
    code: '',
    message: '',
    data: { total: count, page, limit, projects: rows },
  });
});

export default router;
