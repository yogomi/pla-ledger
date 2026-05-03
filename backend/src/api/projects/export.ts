import { Router, Response } from 'express';
import {
  Project, ProjectSection,
  SalesSimulationSnapshot,
  FixedExpense, FixedExpenseMonth,
  Loan, LoanRepayment, LaborCost, LaborCostMonth,
  CashFlowMonthly, Comment,
  FixedAsset, FixedAssetDepreciationSchedule, StartupCost,
} from '../../models';
import { authenticate, AuthRequest } from '../../middleware/auth';
import { getProjectRole } from './utils';

/**
 * @api {GET} /api/projects/:id/export プロジェクトエクスポート
 * @description
 *   - 指定プロジェクトの全データをJSONとしてエクスポートする
 *   - 添付ファイルのメタデータは含むが、ファイル本体は除く
 *   - viewer以上の権限が必要
 *
 * @request
 *   Header:
 *   - Authorization: Bearer <token> (required)
 *   Path:
 *   - id: string (required) - プロジェクトID
 *
 * @response
 *   成功時: { success: true, code: '', message: 'Project exported successfully', data: { version, exportedAt, project, ... } }
 *   失敗時:
 *     - 401: { success: false, code: 'unauthorized', message: 'No token provided', data: null }
 *     - 403: { success: false, code: 'forbidden', message: 'Viewer or above required', data: null }
 *     - 404: { success: false, code: 'not_found', message: 'Project not found', data: null }
 *
 * @responseExample 成功例
 *   {
 *     "success": true,
 *     "code": "",
 *     "message": "Project exported successfully",
 *     "data": {
 *       "version": "1.0",
 *       "exportedAt": "2026-03-21T...",
 *       "project": { ... },
 *       "sections": [ ... ],
 *       "salesSnapshots": [ ... ],
 *       "fixedExpenses": [ ... ],
 *       "fixedExpenseMonths": [ ... ],
 *       "variableExpenses": [ ... ],
 *       "loans": [ ... ],
 *       "loanRepayments": [ ... ],
 *       "laborCosts": [ ... ],
 *       "laborCostMonths": [ ... ],
 *       "cashFlows": [ ... ],
 *       "fixedAssets": [ ... ],
 *       "fixedAssetDepreciationSchedules": [ ... ],
 *       "attachments": [ ... ],
 *       "comments": [ ... ]
 *     }
 *   }
 *
 * @author yogomi
 * @date 2026-03-21
 */
/**
 * Sequelize の DECIMAL フィールドは文字列で返るため、数値文字列を number に変換する。
 * UUID・日付・テキストフィールドには影響しない（数値のみの文字列にのみ適用）。
 */
function normalizeNumbers(obj: object): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string' && /^-?\d+(\.\d+)?$/.test(value)) {
      result[key] = Number(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

const router = Router();

router.get('/:id/export', authenticate, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const role = await getProjectRole(id, req.user!.id);
  const project = await Project.findByPk(id);
  if (!project) {
    res.status(404).json({
      success: false,
      code: 'not_found',
      message: 'Project not found',
      data: null,
    });
    return;
  }
  if (!role) {
    res.status(403).json({
      success: false,
      code: 'forbidden',
      message: 'Viewer or above required',
      data: null,
    });
    return;
  }

  const [
    sections,
    salesSnapshots,
    fixedExpenses,
    fixedExpenseMonths,
    loans,
    loanRepayments,
    laborCosts,
    laborCostMonths,
    cashFlows,
    comments,
    fixedAssets,
    startupCosts,
  ] = await Promise.all([
    ProjectSection.findAll({ where: { project_id: id } }),
    SalesSimulationSnapshot.findAll({ where: { project_id: id } }),
    FixedExpense.findAll({ where: { project_id: id } }),
    FixedExpenseMonth.findAll({ where: { project_id: id } }),
    Loan.findAll({ where: { project_id: id } }),
    LoanRepayment.findAll({ where: { project_id: id } }),
    LaborCost.findAll({ where: { project_id: id } }),
    LaborCostMonth.findAll({ where: { project_id: id } }),
    CashFlowMonthly.findAll({ where: { project_id: id } }),
    Comment.findAll({ where: { project_id: id } }),
    FixedAsset.findAll({ where: { project_id: id } }),
    StartupCost.findAll({
      where: { project_id: id },
      order: [['display_order', 'ASC'], ['created_at', 'ASC']],
    }),
  ]);

  // 固定資産に紐づく償却スケジュールを取得
  const fixedAssetIds = fixedAssets.map(a => a.id);
  const fixedAssetDepreciationSchedules = fixedAssetIds.length > 0
    ? await FixedAssetDepreciationSchedule.findAll({
        where: { fixed_asset_id: fixedAssetIds },
      })
    : [];

  res.json({
    success: true,
    code: '',
    message: 'Project exported successfully',
    data: {
      version: '2.0',
      exportedAt: new Date().toISOString(),
      project: normalizeNumbers(project.toJSON()),
      sections: sections.map(r => r.toJSON()),
      salesSnapshots: salesSnapshots.map(r => r.toJSON()),
      fixedExpenses: fixedExpenses.map(r => normalizeNumbers(r.toJSON())),
      fixedExpenseMonths: fixedExpenseMonths.map(r => r.toJSON()),
      loans: loans.map(r => normalizeNumbers(r.toJSON())),
      loanRepayments: loanRepayments.map(r => normalizeNumbers(r.toJSON())),
      laborCosts: laborCosts.map(r => normalizeNumbers(r.toJSON())),
      laborCostMonths: laborCostMonths.map(r => r.toJSON()),
      cashFlows: cashFlows.map(r => normalizeNumbers(r.toJSON())),
      fixedAssets: fixedAssets.map(r => normalizeNumbers(r.toJSON())),
      fixedAssetDepreciationSchedules: fixedAssetDepreciationSchedules.map(r => normalizeNumbers(r.toJSON())),
      comments: comments.map(r => r.toJSON()),
      startupCosts: startupCosts.map(r => normalizeNumbers(r.toJSON())),
    },
  });
});

export default router;
