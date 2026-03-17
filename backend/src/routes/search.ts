import { Router, Response } from 'express';
import { Op } from 'sequelize';
import { Project } from '../models';
import { optionalAuthenticate, AuthRequest } from '../middleware/auth';
import { SearchQuerySchema } from '../schemas';

const router = Router();

/**
 * @api {GET} /api/search プロジェクト検索
 */
router.get('/', optionalAuthenticate, async (req: AuthRequest, res: Response) => {
  const parsed = SearchQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ success: false, code: 'invalid_query', message: parsed.error.errors.map(e => e.message).join(', '), data: null });
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

  const { count, rows } = await Project.findAndCountAll({ where, limit, offset, order: [['created_at', 'DESC']] });
  res.json({ success: true, code: '', message: '', data: { total: count, page, limit, projects: rows } });
});

export default router;
