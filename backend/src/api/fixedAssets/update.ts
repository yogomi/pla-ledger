import { Router, Response } from 'express';
import { z } from 'zod';
import { sequelize, Project, FixedAsset, FixedAssetDepreciationSchedule } from '../../models';
import { authenticate, AuthRequest } from '../../middleware/auth';
import { getProjectRole } from '../projects/utils';
import { formatZodError } from '../../utils/zodError';
import { UpdateFixedAssetSchema } from '../../schemas/fixedAssets';
import { calculateDepreciationSchedule, calculateAssetInfo } from '../../utils/depreciationCalculator';
import { formatAsset } from './create';

const ParamsSchema = z.object({
  projectId: z.string().uuid(),
  assetId: z.string().uuid(),
});

/**
 * @api {PUT} /api/projects/:projectId/fixed-assets/:assetId 固定資産更新
 * @description
 *   - 固定資産情報を更新し、月次償却スケジュールを再生成する
 *   - editor 以上の権限が必要
 *
 * @request
 *   Header:
 *   - Authorization: Bearer <token> (required)
 *   Path:
 *   - projectId: string (required)
 *   - assetId: string (required)
 *   Body: UpdateFixedAssetSchema（Zod, 部分更新）
 *
 * @response
 *   成功時: { success: true, code: '', message: 'Fixed asset updated successfully',
 *             data: { asset: {...} } }
 *
 * @author yogomi
 * @date 2026-04-04
 */
const router = Router({ mergeParams: true });

router.put('/:assetId', authenticate, async (req: AuthRequest, res: Response) => {
  const parsedParams = ParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json({
      success: false,
      code: 'invalid_request',
      message: formatZodError(parsedParams.error),
      data: null,
    });
    return;
  }
  const { projectId, assetId } = parsedParams.data;

  const project = await Project.findByPk(projectId);
  if (!project) {
    res.status(404).json({
      success: false, code: 'not_found', message: 'Project not found', data: null,
    });
    return;
  }

  const role = await getProjectRole(projectId, req.user!.id);
  if (!role || role === 'viewer') {
    res.status(403).json({
      success: false, code: 'forbidden', message: 'Edit permission required', data: null,
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

  const parsed = UpdateFixedAssetSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      code: 'invalid_request',
      message: formatZodError(parsed.error),
      data: null,
    });
    return;
  }

  // 更新後の値を既存値にマージ
  const purchaseAmount = parsed.data.purchaseAmount ?? Number(asset.purchase_amount);
  const usefulLife = parsed.data.usefulLife ?? asset.useful_life;
  const salvageValue = parsed.data.salvageValue ?? Number(asset.salvage_value);
  const depreciationMethod = parsed.data.depreciationMethod ?? asset.depreciation_method;
  const startDepreciationDate = parsed.data.startDepreciationDate ?? asset.start_depreciation_date;

  const { endDepreciationDate, monthlyDepreciation } = calculateAssetInfo(
    purchaseAmount, salvageValue, usefulLife, depreciationMethod, startDepreciationDate,
  );

  const schedule = calculateDepreciationSchedule({
    purchase_amount: purchaseAmount,
    salvage_value: salvageValue,
    useful_life: usefulLife,
    depreciation_method: depreciationMethod,
    start_depreciation_date: startDepreciationDate,
  });

  const transaction = await sequelize.transaction();
  try {
    await asset.update({
      asset_name: parsed.data.assetName ?? asset.asset_name,
      asset_category: parsed.data.assetCategory ?? asset.asset_category,
      purchase_date: parsed.data.purchaseDate ?? asset.purchase_date,
      purchase_amount: purchaseAmount,
      useful_life: usefulLife,
      salvage_value: salvageValue,
      depreciation_method: depreciationMethod,
      start_depreciation_date: startDepreciationDate,
      end_depreciation_date: endDepreciationDate,
      monthly_depreciation: monthlyDepreciation,
      notes: parsed.data.notes !== undefined ? (parsed.data.notes ?? null) : asset.notes,
    }, { transaction });

    // 既存スケジュールを削除して再生成
    await FixedAssetDepreciationSchedule.destroy({
      where: { fixed_asset_id: assetId },
      transaction,
    });

    await FixedAssetDepreciationSchedule.bulkCreate(
      schedule.map(entry => ({
        fixed_asset_id: assetId,
        year_month: entry.yearMonth,
        monthly_depreciation: entry.monthlyDepreciation,
        accumulated_depreciation: entry.accumulatedDepreciation,
        book_value: entry.bookValue,
      })),
      { transaction },
    );

    await transaction.commit();

    res.json({
      success: true,
      code: '',
      message: 'Fixed asset updated successfully',
      data: { asset: formatAsset(asset) },
    });
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
});

export default router;
