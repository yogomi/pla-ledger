import { Router, Response } from 'express';
import { z } from 'zod';
import { Project } from '../../models';
import { optionalAuthenticate, AuthRequest } from '../../middleware/auth';
import { getProjectRole } from '../projects/utils';
import { formatZodError } from '../../utils/zodError';
import { YearMonthSchema } from '../../schemas/salesSimulation';
import { calculateMonthlyDepreciation } from '../../utils/depreciationCalculator';

const ParamsSchema = z.object({
  projectId: z.string().uuid(),
  yearMonth: YearMonthSchema,
});

/**
 * @api {GET} /api/projects/:projectId/fixed-assets/depreciation/:yearMonth 月次減価償却費計算
 * @description
 *   - 指定年月の全固定資産の月次減価償却費合計を返す
 *   - viewer 以上の権限が必要
 *
 * @request
 *   Header:
 *   - Authorization: Bearer <token> (required)
 *   Path:
 *   - projectId: string (required)
 *   - yearMonth: YYYY-MM 形式
 *
 * @response
 *   成功時: { success: true, code: '', message: 'Depreciation calculated successfully',
 *             data: { yearMonth, totalMonthlyDepreciation } }
 *
 * @author yogomi
 * @date 2026-04-04
 */
const router = Router({ mergeParams: true });

router.get('/depreciation/:yearMonth', optionalAuthenticate, async (req: AuthRequest, res: Response) => {
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
  const { projectId, yearMonth } = parsed.data;

  const project = await Project.findByPk(projectId);
  if (!project) {
    res.status(404).json({
      success: false, code: 'not_found', message: 'Project not found', data: null,
    });
    return;
  }

  const role = await getProjectRole(projectId, req.user?.id);
  if (project.visibility !== 'public' && !role) {
    res.status(403).json({
      success: false, code: 'forbidden', message: 'View permission required', data: null,
    });
    return;
  }

  const totalMonthlyDepreciation = await calculateMonthlyDepreciation(projectId, yearMonth);

  res.json({
    success: true,
    code: '',
    message: 'Depreciation calculated successfully',
    data: { yearMonth, totalMonthlyDepreciation },
  });
});

export default router;
