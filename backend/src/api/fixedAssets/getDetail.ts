import { Router, Response } from 'express';
import { z } from 'zod';
import { Project, FixedAsset, FixedAssetDepreciationSchedule } from '../../models';
import { optionalAuthenticate, AuthRequest } from '../../middleware/auth';
import { getProjectRole } from '../projects/utils';
import { formatZodError } from '../../utils/zodError';
import { formatAsset } from './create';

const ParamsSchema = z.object({
  projectId: z.string().uuid(),
  assetId: z.string().uuid(),
});

/**
 * @api {GET} /api/projects/:projectId/fixed-assets/:assetId 固定資産詳細取得
 * @description
 *   - 固定資産の詳細情報と償却スケジュールを取得する
 *   - viewer 以上の権限が必要
 *
 * @request
 *   Header:
 *   - Authorization: Bearer <token> (required)
 *   Path:
 *   - projectId: string (required)
 *   - assetId: string (required)
 *
 * @response
 *   成功時: { success: true, code: '', message: 'Fixed asset retrieved successfully',
 *             data: { asset: {...}, schedule: [...] } }
 *
 * @author yogomi
 * @date 2026-04-04
 */
const router = Router({ mergeParams: true });

router.get('/:assetId', optionalAuthenticate, async (req: AuthRequest, res: Response) => {
  const parsed = ParamsSchema.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      code: 'invalid_request',
      message: formatZodError(parsed.error),
      data: null,
    });
    return;
  }
  const { projectId, assetId } = parsed.data;

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

  const asset = await FixedAsset.findOne({
    where: { id: assetId, project_id: projectId },
  });
  if (!asset) {
    res.status(404).json({
      success: false, code: 'not_found', message: 'Fixed asset not found', data: null,
    });
    return;
  }

  const schedules = await FixedAssetDepreciationSchedule.findAll({
    where: { fixed_asset_id: assetId },
    order: [['year_month', 'ASC']],
  });

  res.json({
    success: true,
    code: '',
    message: 'Fixed asset retrieved successfully',
    data: {
      asset: formatAsset(asset),
      schedule: schedules.map(s => ({
        yearMonth: s.year_month,
        monthlyDepreciation: Number(s.monthly_depreciation),
        accumulatedDepreciation: Number(s.accumulated_depreciation),
        bookValue: Number(s.book_value),
      })),
    },
  });
});

export default router;
