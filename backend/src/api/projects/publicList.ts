import { Router, Response } from 'express';
import { Op } from 'sequelize';
import { Project } from '../../models';
import { PublicProjectsQuerySchema } from '../../schemas';
import { formatZodError } from '../../utils/zodError';

/**
 * @api {GET} /api/projects/public 公開プロジェクト一覧
 * @description
 *   - 公開（visibility: 'public'）のプロジェクト一覧を取得する
 *   - キーワード・通貨でフィルタリング可能
 *   - ページネーション対応
 *
 * @request
 *   Query:
 *   - page: number (optional, default: 1) - ページ番号（1以上）
 *   - limit: number (optional, default: 20, max: 100) - 1ページあたりの件数
 *   - keyword: string (optional) - タイトルの部分一致フィルタ
 *   - currency: string (optional) - 通貨フィルタ
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
 *       "total": 100,
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
 *     "message": "Number must be greater than or equal to 1",
 *     "data": null
 *   }
 *
 * @author yogomi
 * @date 2026-03-17
 */
const router = Router();

router.get('/', async (req, res: Response) => {
  const parsed = PublicProjectsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      code: 'invalid_query',
      message: formatZodError(parsed.error),
      data: null,
    });
    return;
  }
  const { page, limit, keyword, currency } = parsed.data;
  const where: Record<string, unknown> = { visibility: 'public' };
  if (currency) where['currency'] = currency;
  if (keyword) {
    where['title'] = { [Op.like]: `%${keyword}%` };
  }
  const offset = (page - 1) * limit;
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
