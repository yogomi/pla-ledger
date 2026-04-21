import { Router, Response } from 'express';
import { z } from 'zod';
import { sequelize, Project, StartupCost } from '../../models';
import { authenticate, AuthRequest } from '../../middleware/auth';
import { getProjectRole } from '../projects/utils';
import { formatZodError } from '../../utils/zodError';

const ParamsSchema = z.object({
  projectId: z.string().uuid(),
});

/** YYYY-MM形式の年月バリデーション */
const YearMonthRegex = /^\d{4}-\d{2}$/;

const StartupCostInputSchema = z.object({
  description: z.string().min(1).max(255),
  // Sequelize DECIMAL由来で文字列が来るケースを防御的に受け付ける
  quantity: z.coerce.number().positive(),
  unit_price: z.coerce.number().min(0),
  cost_type: z.enum(['capex', 'intangible', 'expense', 'initial_inventory']),
  allocation_month: z.string().regex(YearMonthRegex, 'YYYY-MM format required'),
  display_order: z.number().int().min(0).optional().default(0),
});

const BodySchema = z.object({
  items: z.array(StartupCostInputSchema),
});

/**
 * @api {PUT} /api/projects/:projectId/startup-costs スタートアップコスト一括更新
 * @description
 *   - スタートアップコストを配列で受け取り、既存データを全削除して再作成
 *   - editor以上の権限が必要
 *
 * @request
 *   - params: projectId (UUID)
 *   - body: { items: StartupCostInput[] }
 *   - バリデーションはZodで実施
 *   - バリデーション失敗時: { success: false, code: 'invalid_query', message: '...', data: null }
 *
 * @response
 *   - 成功時: { success: true, code: '', message: 'Startup costs updated',
 *               data: { items: [...] } }
 *
 * @author yogomi
 * @date 2026-04-09
 */
const router = Router({ mergeParams: true });

router.put('/', authenticate, async (req: AuthRequest, res: Response) => {
  const parsed = ParamsSchema.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      code: 'invalid_query',
      message: formatZodError(parsed.error),
      data: null,
    });
    return;
  }
  const { projectId } = parsed.data;

  const bodyParsed = BodySchema.safeParse(req.body);
  if (!bodyParsed.success) {
    res.status(400).json({
      success: false,
      code: 'invalid_query',
      message: formatZodError(bodyParsed.error),
      data: null,
    });
    return;
  }
  const { items } = bodyParsed.data;

  const project = await Project.findByPk(projectId);
  if (!project) {
    res.status(404).json({
      success: false,
      code: 'not_found',
      message: 'Project not found',
      data: null,
    });
    return;
  }

  const role = await getProjectRole(projectId, req.user!.id);
  if (!role || role === 'viewer') {
    res.status(403).json({
      success: false,
      code: 'forbidden',
      message: 'Edit permission required',
      data: null,
    });
    return;
  }

  // トランザクション内で全削除→再作成
  const transaction = await sequelize.transaction();
  try {
    await StartupCost.destroy({ where: { project_id: projectId }, transaction });

    const created = await Promise.all(
      items.map((item, index) =>
        StartupCost.create({
          project_id: projectId,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          cost_type: item.cost_type,
          allocation_month: item.allocation_month,
          display_order: item.display_order ?? index,
        }, { transaction }),
      ),
    );

    await transaction.commit();

    res.json({
      success: true,
      code: '',
      message: 'Startup costs updated',
      data: { items: created.map(item => item.toJSON()) },
    });
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
});

export default router;
