import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { sequelize } from '../../models';
import {
  Project, Permission, ProjectSection,
  SalesSimulationCategory, SalesSimulationItem, SalesSimulationSnapshot,
  FixedExpense, FixedExpenseMonth, VariableExpense,
  Loan, LoanRepayment, LaborCost, LaborCostMonth,
  CashFlowMonthly, Comment, ActivityLog,
  FixedAsset, FixedAssetDepreciationSchedule, StartupCost,
} from '../../models';
import { authenticate, AuthRequest } from '../../middleware/auth';
import { ProjectImportSchema } from '../../schemas';
import { formatZodError } from '../../utils/zodError';

const SUPPORTED_VERSIONS = ['1.0'];

/**
 * @api {POST} /api/projects/import プロジェクトインポート
 * @description
 *   - エクスポートされたJSONデータを元に新規プロジェクトを作成する
 *   - 全レコードは新しいUUIDで作成される
 *   - owner_id, created_by, uploaded_by, author_id は現在のユーザーIDに設定される
 *   - インポートユーザーにowner権限が付与される
 *   - トランザクション内で処理し、エラー時はロールバックする
 *   - 認証が必要
 *
 * @request
 *   Header:
 *   - Authorization: Bearer <token> (required)
 *   Body (JSON):
 *   - data: object (required) - エクスポートされたJSONデータ
 *   - newTitle: string (optional) - 新しいプロジェクト名（省略時はエクスポートデータのタイトルを使用）
 *   バリデーションはZodで行い、失敗時は
 *   { success: false, code: 'invalid_query', message: エラー内容, data: null }
 *
 * @response
 *   成功時: { success: true, code: '', message: 'Project imported successfully', data: { projectId } }
 *   失敗時:
 *     - 400: { success: false, code: 'invalid_query', message: エラー内容, data: null }
 *     - 401: { success: false, code: 'unauthorized', message: 'No token provided', data: null }
 *     - 409: { success: false, code: 'duplicate_project_name',
 *              message: 'Project name already exists', data: null }
 *     - 422: { success: false, code: 'unsupported_version',
 *              message: 'Unsupported export version', data: null }
 *
 * @responseExample 成功例
 *   {
 *     "success": true,
 *     "code": "",
 *     "message": "Project imported successfully",
 *     "data": { "projectId": "new-uuid" }
 *   }
 *
 * @responseExample 失敗例
 *   {
 *     "success": false,
 *     "code": "duplicate_project_name",
 *     "message": "Project name already exists",
 *     "data": null
 *   }
 *
 * @author yogomi
 * @date 2026-03-21
 */
const router = Router();

router.post('/import', authenticate, async (req: AuthRequest, res: Response) => {
  const parsed = ProjectImportSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      code: 'invalid_query',
      message: formatZodError(parsed.error),
      data: null,
    });
    return;
  }

  const { data: exportData, newTitle } = parsed.data;
  const userId = req.user!.id;

  // バージョンチェック
  if (!SUPPORTED_VERSIONS.includes(exportData.version)) {
    res.status(422).json({
      success: false,
      code: 'unsupported_version',
      message: 'Unsupported export version',
      data: null,
    });
    return;
  }

  // プロジェクト名の決定と重複チェック
  const title = newTitle ?? exportData.project.title;
  const existing = await Project.findOne({ where: { title } });
  if (existing) {
    res.status(409).json({
      success: false,
      code: 'duplicate_project_name',
      message: 'Project name already exists',
      data: null,
    });
    return;
  }

  const transaction = await sequelize.transaction();
  try {
    const newProjectId = uuidv4();

    // カテゴリIDのマッピング（旧ID → 新ID）
    const categoryIdMap: Record<string, string> = {};
    exportData.salesCategories.forEach(c => {
      categoryIdMap[c.id] = uuidv4();
    });

    // 売上シミュレーション品目IDのマッピング（旧ID → 新ID）
    const itemIdMap: Record<string, string> = {};
    exportData.salesItems.forEach(item => {
      itemIdMap[item.id] = uuidv4();
    });

    // 借入IDのマッピング（旧ID → 新ID）
    const loanIdMap: Record<string, string> = {};
    exportData.loans.forEach(l => {
      loanIdMap[l.id] = uuidv4();
    });

    // 固定資産IDのマッピング（旧ID → 新ID）
    const fixedAssetIdMap: Record<string, string> = {};
    (exportData.fixedAssets ?? []).forEach(a => {
      fixedAssetIdMap[a.id] = uuidv4();
    });

    // プロジェクト作成
    await Project.create({
      id: newProjectId,
      owner_id: userId,
      title,
      summary: exportData.project.summary,
      visibility: exportData.project.visibility,
      currency: exportData.project.currency,
      tags: exportData.project.tags,
      published_at: exportData.project.visibility === 'public' ? new Date() : null,
      social_insurance_rate: exportData.project.social_insurance_rate,
      initial_cash_balance: exportData.project.initial_cash_balance ?? 0,
      planned_opening_date: exportData.project.planned_opening_date ?? null,
    }, { transaction });

    // オーナー権限付与
    await Permission.create({
      project_id: newProjectId,
      user_id: userId,
      role: 'owner',
      granted_by: null,
      granted_at: new Date(),
    }, { transaction });

    // セクション作成
    if (exportData.sections.length > 0) {
      await Promise.all(exportData.sections.map(s => ProjectSection.create({
        project_id: newProjectId,
        type: s.type,
        content: s.content,
        version: s.version,
        created_by: userId,
      }, { transaction })));
    }

    // 売上シミュレーションカテゴリ作成
    if (exportData.salesCategories.length > 0) {
      await Promise.all(exportData.salesCategories.map(c => SalesSimulationCategory.create({
        id: categoryIdMap[c.id],
        project_id: newProjectId,
        category_name: c.category_name,
        category_order: c.category_order,
      }, { transaction })));
    }

    // 売上シミュレーション品目作成（category_idを新IDに置換、品目IDも明示的に指定）
    if (exportData.salesItems.length > 0) {
      await Promise.all(exportData.salesItems.map(item => SalesSimulationItem.create({
        id: itemIdMap[item.id],
        category_id: categoryIdMap[item.category_id],
        project_id: newProjectId,
        item_name: item.item_name,
        item_order: item.item_order,
        unit_price: item.unit_price,
        quantity: item.quantity,
        operating_days: item.operating_days,
        cost_rate: item.cost_rate,
        description: item.description,
      }, { transaction })));
    }

    // 売上スナップショット作成（items_snapshot内のitemId・categoryIdを新IDに置換）
    if (exportData.salesSnapshots.length > 0) {
      await Promise.all(exportData.salesSnapshots.map(s => {
        const remappedSnapshot = s.items_snapshot.map(entry => ({
          ...entry,
          itemId: itemIdMap[(entry as Record<string, unknown>)['itemId'] as string]
            ?? (entry as Record<string, unknown>)['itemId'],
          categoryId: categoryIdMap[(entry as Record<string, unknown>)['categoryId'] as string]
            ?? (entry as Record<string, unknown>)['categoryId'],
        }));
        return SalesSimulationSnapshot.create({
          project_id: newProjectId,
          year_month: s.year_month,
          items_snapshot: remappedSnapshot as unknown as
            import('../../models').SalesSimulationSnapshot['items_snapshot'],
        }, { transaction });
      }));
    }

    // 固定費作成
    if (exportData.fixedExpenses.length > 0) {
      await Promise.all(exportData.fixedExpenses.map(e => FixedExpense.create({
        project_id: newProjectId,
        year_month: e.year_month,
        category_name: e.category_name,
        amount: e.amount,
        description: e.description,
      }, { transaction })));
    }

    // 固定費月作成
    if (exportData.fixedExpenseMonths.length > 0) {
      await Promise.all(exportData.fixedExpenseMonths.map(m => FixedExpenseMonth.create({
        project_id: newProjectId,
        year_month: m.year_month,
      }, { transaction })));
    }

    // 変動費作成
    if (exportData.variableExpenses.length > 0) {
      await Promise.all(exportData.variableExpenses.map(e => VariableExpense.create({
        project_id: newProjectId,
        year_month: e.year_month,
        category_name: e.category_name,
        amount: e.amount,
        description: e.description,
      }, { transaction })));
    }

    // 借入作成
    if (exportData.loans.length > 0) {
      await Promise.all(exportData.loans.map(l => Loan.create({
        id: loanIdMap[l.id],
        project_id: newProjectId,
        lender_name: l.lender_name,
        principal_amount: l.principal_amount,
        interest_rate: l.interest_rate,
        loan_date: l.loan_date,
        repayment_start_date: l.repayment_start_date,
        deferred_interest_policy: l.deferred_interest_policy,
        repayment_months: l.repayment_months,
        repayment_method: l.repayment_method,
        description: l.description,
      }, { transaction })));
    }

    // 返済スケジュール作成（loan_idを新IDに置換）
    if (exportData.loanRepayments.length > 0) {
      await Promise.all(exportData.loanRepayments.map(r => LoanRepayment.create({
        loan_id: loanIdMap[r.loan_id],
        project_id: newProjectId,
        year_month: r.year_month,
        principal_payment: r.principal_payment,
        interest_payment: r.interest_payment,
        remaining_balance: r.remaining_balance,
      }, { transaction })));
    }

    // 人件費作成
    if (exportData.laborCosts.length > 0) {
      await Promise.all(exportData.laborCosts.map(lc => LaborCost.create({
        project_id: newProjectId,
        year_month: lc.year_month,
        type: lc.type,
        monthly_salary: lc.monthly_salary,
        employee_count: lc.employee_count,
        bonus_months: lc.bonus_months,
        hourly_wage: lc.hourly_wage,
        hours_per_day: lc.hours_per_day,
        days_per_month: lc.days_per_month,
        part_time_count: lc.part_time_count,
        owner_salary: lc.owner_salary,
        display_order: lc.display_order,
        note_ja: lc.note_ja,
        note_en: lc.note_en,
      }, { transaction })));
    }

    // 人件費月作成
    if (exportData.laborCostMonths.length > 0) {
      await Promise.all(exportData.laborCostMonths.map(m => LaborCostMonth.create({
        project_id: newProjectId,
        year_month: m.year_month,
      }, { transaction })));
    }

    // キャッシュフロー作成
    if (exportData.cashFlows.length > 0) {
      await Promise.all(exportData.cashFlows.map(cf => CashFlowMonthly.create({
        project_id: newProjectId,
        year_month: cf.year_month,
        accounts_receivable_change: cf.accounts_receivable_change,
        inventory_change: cf.inventory_change,
        accounts_payable_change: cf.accounts_payable_change,
        other_operating: cf.other_operating,
        capex_acquisition: cf.capex_acquisition,
        asset_sale: cf.asset_sale,
        intangible_acquisition: cf.intangible_acquisition,
        other_investing: cf.other_investing,
        capital_increase: cf.capital_increase,
        dividend_payment: cf.dividend_payment,
        other_financing: cf.other_financing,
        is_inherited: cf.is_inherited,
        note_ja: cf.note_ja,
        note_en: cf.note_en,
      }, { transaction })));
    }

    // 固定資産作成
    if ((exportData.fixedAssets ?? []).length > 0) {
      await Promise.all((exportData.fixedAssets ?? []).map(a => FixedAsset.create({
        id: fixedAssetIdMap[a.id],
        project_id: newProjectId,
        asset_name: a.asset_name,
        asset_category: a.asset_category,
        purchase_date: a.purchase_date,
        purchase_amount: a.purchase_amount,
        useful_life: a.useful_life,
        salvage_value: a.salvage_value,
        depreciation_method: a.depreciation_method,
        start_depreciation_date: a.start_depreciation_date,
        end_depreciation_date: a.end_depreciation_date,
        monthly_depreciation: a.monthly_depreciation,
        notes: a.notes,
      }, { transaction })));
    }

    // 固定資産償却スケジュール作成（fixed_asset_idを新IDに置換）
    if ((exportData.fixedAssetDepreciationSchedules ?? []).length > 0) {
      await Promise.all((exportData.fixedAssetDepreciationSchedules ?? []).map(s =>
        FixedAssetDepreciationSchedule.create({
          fixed_asset_id: fixedAssetIdMap[s.fixed_asset_id] ?? s.fixed_asset_id,
          year_month: s.year_month,
          monthly_depreciation: s.monthly_depreciation,
          accumulated_depreciation: s.accumulated_depreciation,
          book_value: s.book_value,
        }, { transaction }),
      ));
    }

    // コメント作成（author_id は現在のユーザーIDに設定）
    if (exportData.comments.length > 0) {
      await Promise.all(exportData.comments.map(c => Comment.create({
        project_id: newProjectId,
        section_id: null,
        author_id: userId,
        body: c.body,
      }, { transaction })));
    }

    // スタートアップコスト作成
    if ((exportData.startupCosts ?? []).length > 0) {
      await Promise.all((exportData.startupCosts ?? []).map(sc => StartupCost.create({
        project_id: newProjectId,
        description: sc.description,
        quantity: sc.quantity,
        unit_price: sc.unit_price,
        cost_type: sc.cost_type,
        allocation_month: sc.allocation_month,
        display_order: sc.display_order,
      }, { transaction })));
    }

    // アクティビティログ記録
    await ActivityLog.create({
      project_id: newProjectId,
      user_id: userId,
      action: 'project_imported',
      meta: { title, originalTitle: exportData.project.title },
    }, { transaction });

    await transaction.commit();

    res.status(201).json({
      success: true,
      code: '',
      message: 'Project imported successfully',
      data: { projectId: newProjectId },
    });
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
});

export default router;
