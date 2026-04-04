import { Router, Response } from 'express';
import { z } from 'zod';
import { sequelize, Project, FixedAsset, FixedAssetDepreciationSchedule } from '../../models';
import { authenticate, AuthRequest } from '../../middleware/auth';
import { getProjectRole } from '../projects/utils';
import { formatZodError } from '../../utils/zodError';
import { CreateFixedAssetSchema } from '../../schemas/fixedAssets';
import { calculateDepreciationSchedule, calculateAssetInfo } from '../../utils/depreciationCalculator';

const ParamsSchema = z.object({
  projectId: z.string().uuid(),
});

/**
 * @api {POST} /api/projects/:projectId/fixed-assets 固定資産登録
 * @description
 *   - 新規固定資産を登録し、月次償却スケジュールを自動生成する
 *   - editor 以上の権限が必要
 *
 * @request
 *   Header:
 *   - Authorization: Bearer <token> (required)
 *   Path:
 *   - projectId: string (required) - プロジェクトID
 *   Body: CreateFixedAssetSchema（Zod）
 *   バリデーション失敗時:
 *   { success: false, code: 'invalid_request', message: エラー内容, data: null }
 *
 * @response
 *   成功時: { success: true, code: '', message: 'Fixed asset created successfully',
 *             data: { asset: {...}, schedule: [...] } }
 *
 * @responseExample 成功例
 *   {
 *     "success": true,
 *     "code": "",
 *     "message": "Fixed asset created successfully",
 *     "data": {
 *       "asset": { "id": "...", "assetName": "建物改修", ... },
 *       "schedule": [ { "yearMonth": "2026-12", "monthlyDepreciation": 50000, ... } ]
 *     }
 *   }
 *
 * @responseExample 失敗例
 *   {
 *     "success": false,
 *     "code": "invalid_request",
 *     "message": "purchaseAmount: Expected positive number",
 *     "data": null
 *   }
 *
 * @author yogomi
 * @date 2026-04-04
 */
const router = Router({ mergeParams: true });

router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
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
  const { projectId } = parsedParams.data;

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

  const parsed = CreateFixedAssetSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      code: 'invalid_request',
      message: formatZodError(parsed.error),
      data: null,
    });
    return;
  }

  const {
    assetName,
    assetCategory,
    purchaseDate,
    purchaseAmount,
    usefulLife,
    salvageValue,
    depreciationMethod,
    startDepreciationDate,
    notes,
  } = parsed.data;

  const salvage = salvageValue ?? 0;
  const { endDepreciationDate, monthlyDepreciation } = calculateAssetInfo(
    purchaseAmount, salvage, usefulLife, depreciationMethod, startDepreciationDate,
  );

  const schedule = calculateDepreciationSchedule({
    purchase_amount: purchaseAmount,
    salvage_value: salvage,
    useful_life: usefulLife,
    depreciation_method: depreciationMethod,
    start_depreciation_date: startDepreciationDate,
  });

  const transaction = await sequelize.transaction();
  try {
    const asset = await FixedAsset.create({
      project_id: projectId,
      asset_name: assetName,
      asset_category: assetCategory,
      purchase_date: purchaseDate,
      purchase_amount: purchaseAmount,
      useful_life: usefulLife,
      salvage_value: salvage,
      depreciation_method: depreciationMethod,
      start_depreciation_date: startDepreciationDate,
      end_depreciation_date: endDepreciationDate,
      monthly_depreciation: monthlyDepreciation,
      notes: notes ?? null,
    }, { transaction });

    await FixedAssetDepreciationSchedule.bulkCreate(
      schedule.map(entry => ({
        fixed_asset_id: asset.id,
        year_month: entry.yearMonth,
        monthly_depreciation: entry.monthlyDepreciation,
        accumulated_depreciation: entry.accumulatedDepreciation,
        book_value: entry.bookValue,
      })),
      { transaction },
    );

    await transaction.commit();

    res.status(201).json({
      success: true,
      code: '',
      message: 'Fixed asset created successfully',
      data: {
        asset: formatAsset(asset),
        schedule: schedule.slice(0, 24), // 最初の2年分を返す
      },
    });
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
});

/**
 * 固定資産レコードをAPIレスポンス形式に変換する。
 */
export function formatAsset(asset: FixedAsset) {
  return {
    id: asset.id,
    projectId: asset.project_id,
    assetName: asset.asset_name,
    assetCategory: asset.asset_category,
    purchaseDate: asset.purchase_date,
    purchaseAmount: Number(asset.purchase_amount),
    usefulLife: asset.useful_life,
    salvageValue: Number(asset.salvage_value),
    depreciationMethod: asset.depreciation_method,
    startDepreciationDate: asset.start_depreciation_date,
    endDepreciationDate: asset.end_depreciation_date,
    monthlyDepreciation: Number(asset.monthly_depreciation),
    notes: asset.notes,
    createdAt: (asset as { created_at?: unknown }).created_at,
    updatedAt: (asset as { updated_at?: unknown }).updated_at,
  };
}

export default router;
