import { Router, Response } from 'express';
import { Op } from 'sequelize';
import {
  Project, CashFlowMonthly, LoanRepayment, Loan,
  SalesSimulationSnapshot, FixedExpense, VariableExpense, LaborCost, LaborCostMonth, FixedExpenseMonth,
  StartupCost,
} from '../../models';
import { authenticate, AuthRequest } from '../../middleware/auth';
import { getProjectRole } from '../projects/utils';
import { formatZodError } from '../../utils/zodError';
import { YearMonthSchema } from '../../schemas/salesSimulation';
import { z } from 'zod';
import { getPreviousSnapshot, calculateSnapshotTotals } from '../../utils/salesSimulationHelper';
import { calculateMonthlyDepreciation } from '../../utils/depreciationCalculator';
import { calcLaborMonthlyTotal } from '../../utils/laborCostCalculator';

const ParamsSchema = z.object({
  projectId: z.string().uuid(),
  yearMonth: YearMonthSchema,
});

/**
 * 指定月の税引前利益・利息支払額・減価償却費を損益計算表ロジックで計算する。
 * 売上スナップショット・固定費・変動費・人件費の継承ロジックを含む。
 * 減価償却費は totalExpense に含めて営業利益を算出し、利息控除後の税引前利益を返す。
 * @param projectId - プロジェクトID
 * @param yearMonth - 対象年月 (YYYY-MM)
 * @returns 税引前利益（profitBeforeTax）、利息支払額（interestExpense）、月次減価償却費（depreciation）
 */
async function fetchProfitAndInterest(
  projectId: string,
  yearMonth: string,
): Promise<{ profitBeforeTax: number; interestExpense: number; depreciation: number }> {
  let snapshot: SalesSimulationSnapshot | null = await SalesSimulationSnapshot.findOne({
    where: { project_id: projectId, year_month: yearMonth },
  });

  if (!snapshot) {
    snapshot = await getPreviousSnapshot(projectId, yearMonth);
  }

  let monthlySales = 0;
  let monthlyCost = 0;
  if (snapshot) {
    const totals = calculateSnapshotTotals(snapshot.items_snapshot);
    monthlySales = totals.monthlyTotal;
    monthlyCost = totals.monthlyCost;
  }

  let fixedExpenses = await FixedExpense.findAll({
    where: { project_id: projectId, year_month: yearMonth },
  });
  if (fixedExpenses.length === 0) {
    const savedRecord = await FixedExpenseMonth.findOne({
      where: { project_id: projectId, year_month: yearMonth },
    });
    if (!savedRecord) {
      const recentFixed = await FixedExpense.findOne({
        where: { project_id: projectId, year_month: { [Op.lt]: yearMonth } },
        order: [['year_month', 'DESC']],
      });
      if (recentFixed) {
        fixedExpenses = await FixedExpense.findAll({
          where: { project_id: projectId, year_month: recentFixed.year_month },
        });
      }
    }
  }

  const variableExpenses = await VariableExpense.findAll({
    where: { project_id: projectId, year_month: yearMonth },
  });

  let laborCosts = await LaborCost.findAll({
    where: { project_id: projectId, year_month: yearMonth },
  });
  if (laborCosts.length === 0) {
    const savedLaborRecord = await LaborCostMonth.findOne({
      where: { project_id: projectId, year_month: yearMonth },
    });
    if (!savedLaborRecord) {
      const recentLabor = await LaborCost.findOne({
        where: { project_id: projectId, year_month: { [Op.lt]: yearMonth } },
        order: [['year_month', 'DESC']],
      });
      if (recentLabor) {
        laborCosts = await LaborCost.findAll({
          where: { project_id: projectId, year_month: recentLabor.year_month },
        });
      }
    }
  }

  const fixedTotal = fixedExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const variableTotal = variableExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const project = await Project.findByPk(projectId, { attributes: ['social_insurance_rate'] });
  const socialInsuranceRate = Number(project?.social_insurance_rate ?? 0);
  const laborTotal = laborCosts.reduce(
    (sum, lc) => sum + calcLaborMonthlyTotal(lc, socialInsuranceRate),
    0,
  );
  // 減価償却費は営業利益の計算に含める（損益計算書と一致させるため）
  const depreciation = await calculateMonthlyDepreciation(projectId, yearMonth);
  const totalExpense = monthlyCost + fixedTotal + variableTotal + laborTotal + depreciation;
  const operatingProfit = monthlySales - totalExpense;

  // 利息支払額：当月の返済スケジュールから集計する
  const repayments = await LoanRepayment.findAll({
    where: { project_id: projectId, year_month: yearMonth },
    attributes: ['interest_payment'],
  });
  const interestExpense = repayments.reduce((sum, r) => sum + Number(r.interest_payment), 0);

  // 税引前利益 = 営業利益 - 利息費用（損益計算書の定義と一致させる）
  const profitBeforeTax = operatingProfit - interestExpense;

  return { profitBeforeTax, interestExpense, depreciation };
}

/**
 * 当月の借入実行額と返済額を借入管理から集計する。
 * @param projectId - プロジェクトID
 * @param yearMonth - 対象年月 (YYYY-MM)
 * @returns 借入実行額（borrowingProceeds, 正値）と元金返済額（loanRepaymentAmount, 負値）
 */
async function fetchBorrowingData(
  projectId: string,
  yearMonth: string,
): Promise<{ borrowingProceeds: number; loanRepaymentAmount: number }> {
  // 当月実行の新規借入額（loan_date が当月のもの）
  const loans = await Loan.findAll({
    where: {
      project_id: projectId,
      loan_date: { [Op.like]: `${yearMonth}-%` },
    },
    attributes: ['principal_amount'],
  });
  const borrowingProceeds = loans.reduce((sum, l) => sum + Number(l.principal_amount), 0);

  // 当月の元金返済額
  const repayments = await LoanRepayment.findAll({
    where: { project_id: projectId, year_month: yearMonth },
    attributes: ['principal_payment'],
  });
  const loanRepaymentAmount = repayments.reduce((sum, r) => sum + Number(r.principal_payment), 0);

  return { borrowingProceeds, loanRepaymentAmount: -loanRepaymentAmount };
}

/** スタートアップコスト集計結果の型 */
export interface StartupCostTotals {
  capex: number;
  intangible: number;
  expense: number;
  initialInventory: number;
}

/** スタートアップコストがゼロの初期値 */
const ZERO_TOTALS: StartupCostTotals = {
  capex: 0, intangible: 0, expense: 0, initialInventory: 0,
};

/**
 * 指定期間のスタートアップコストを一括取得し、年月をキーとするマップを返す。
 * N+1クエリを避けるため、ループ前に呼び出して使用する。
 * @param projectId - プロジェクトID
 * @param startYearMonth - 取得開始年月 (YYYY-MM)
 * @param endYearMonth - 取得終了年月 (YYYY-MM)
 * @returns 年月 → cost_typeごとの合計（マイナス値）のマップ
 */
async function fetchStartupCostMap(
  projectId: string,
  startYearMonth: string,
  endYearMonth: string,
): Promise<Map<string, StartupCostTotals>> {
  const costs = await StartupCost.findAll({
    where: {
      project_id: projectId,
      allocation_month: { [Op.between]: [startYearMonth, endYearMonth] },
    },
  });

  const map = new Map<string, StartupCostTotals>();
  for (const cost of costs) {
    const ym = cost.allocation_month;
    if (!map.has(ym)) {
      map.set(ym, { capex: 0, intangible: 0, expense: 0, initialInventory: 0 });
    }
    const entry = map.get(ym)!;
    const amount = Number(cost.quantity) * Number(cost.unit_price);
    if (cost.cost_type === 'capex') {
      entry.capex -= amount;
    } else if (cost.cost_type === 'intangible') {
      entry.intangible -= amount;
    } else if (cost.cost_type === 'expense') {
      entry.expense -= amount;
    } else if (cost.cost_type === 'initial_inventory') {
      entry.initialInventory -= amount;
    }
  }
  return map;
}

/**
 * 指定月のスタートアップコストを集計して返す。
 * @param projectId - プロジェクトID
 * @param yearMonth - 対象年月 (YYYY-MM)
 * @returns cost_typeごとの合計（マイナス値）
 */
async function fetchStartupCostTotals(
  projectId: string,
  yearMonth: string,
): Promise<StartupCostTotals> {
  const map = await fetchStartupCostMap(projectId, yearMonth, yearMonth);
  return map.get(yearMonth) ?? { ...ZERO_TOTALS };
}

/**
 * 2025-01 から指定月までの現金残高を順次計算する。
 * プロジェクトの initial_cash_balance を起点として、各月の net_cash_change を累積する。
 * 保存済みレコードは一括取得してマップ化し、N+1クエリを防ぐ。
 * @param projectId - プロジェクトID
 * @param targetYearMonth - 対象年月 (YYYY-MM)
 * @returns 対象月の期首残高（cashBeginning）と期末残高（cashEnding）
 */
async function calculateCashBalanceUpToMonth(
  projectId: string,
  targetYearMonth: string,
): Promise<{ cashBeginning: number; cashEnding: number }> {
  const project = await Project.findByPk(projectId, {
    attributes: ['initial_cash_balance', 'planned_opening_date'],
  });
  if (!project) {
    throw new Error('Project not found');
  }

  // 開業予定日（未設定の場合は 2025-01 をデフォルト使用）
  const startYearMonth = project.planned_opening_date ?? '2025-01';
  const [startYear, startMonth] = startYearMonth.split('-').map(Number);
  const [targetYear, targetMonth] = targetYearMonth.split('-').map(Number);

  // startYearMonth から targetYearMonth までの保存済みレコードを一括取得してマップ化する
  const savedRecords = await CashFlowMonthly.findAll({
    where: {
      project_id: projectId,
      year_month: { [Op.between]: [startYearMonth, targetYearMonth] },
    },
    order: [['year_month', 'ASC']],
  });
  const savedRecordsMap = new Map(savedRecords.map(r => [r.year_month, r]));

  // スタートアップコストを一括取得してマップ化する（N+1クエリを防ぐ）
  const startupCostMap = await fetchStartupCostMap(projectId, startYearMonth, targetYearMonth);

  let runningBalance = Number(project.initial_cash_balance);
  let cashBeginning = runningBalance;

  // startYearMonth から targetYearMonth まで月ごとに累積する
  for (let y = startYear; y <= targetYear; y++) {
    const firstMonth = y === startYear ? startMonth : 1;
    const lastMonth = y === targetYear ? targetMonth : 12;
    for (let m = firstMonth; m <= lastMonth; m++) {
      const yearMonth = `${y}-${String(m).padStart(2, '0')}`;

      if (yearMonth === targetYearMonth) {
        cashBeginning = runningBalance;
      }

      const startupTotals = startupCostMap.get(yearMonth) ?? { ...ZERO_TOTALS };
      // スタートアップコスト由来の各合計
      const startupOperating = startupTotals.expense + startupTotals.initialInventory;
      const startupInvesting = startupTotals.capex + startupTotals.intangible;

      let netCashChange: number;
      if (savedRecordsMap.has(yearMonth)) {
        // 保存済み月：手動入力値はDBから取得し、自動連携項目はライブ再計算する
        const savedRecord = savedRecordsMap.get(yearMonth)!;
        const { profitBeforeTax, depreciation } =
          await fetchProfitAndInterest(projectId, yearMonth);
        const { borrowingProceeds, loanRepaymentAmount } =
          await fetchBorrowingData(projectId, yearMonth);
        netCashChange =
          profitBeforeTax + depreciation
          + Number(savedRecord.accounts_receivable_change)
          + Number(savedRecord.inventory_change) + startupTotals.initialInventory
          + Number(savedRecord.accounts_payable_change)
          + Number(savedRecord.other_operating) + startupTotals.expense
          + Number(savedRecord.capex_acquisition) + startupTotals.capex
          + Number(savedRecord.asset_sale)
          + Number(savedRecord.intangible_acquisition) + startupTotals.intangible
          + Number(savedRecord.other_investing)
          + borrowingProceeds + loanRepaymentAmount
          + Number(savedRecord.capital_increase)
          + Number(savedRecord.dividend_payment)
          + Number(savedRecord.other_financing);
      } else {
        // 未保存月は自動連携データから計算（手動調整項目はゼロ）
        const { profitBeforeTax, depreciation } =
          await fetchProfitAndInterest(projectId, yearMonth);
        const { borrowingProceeds, loanRepaymentAmount } =
          await fetchBorrowingData(projectId, yearMonth);
        netCashChange =
          profitBeforeTax + depreciation + borrowingProceeds + loanRepaymentAmount
          + startupOperating + startupInvesting;
      }

      runningBalance += netCashChange;
    }
  }

  return { cashBeginning, cashEnding: runningBalance };
}

/**
 * @api {GET} /api/projects/:projectId/cash-flow/monthly/:yearMonth 月次キャッシュフロー取得
 * @description
 *   - 指定月のキャッシュフローデータを取得
 *   - 期首残高・期末残高は 2025-01 からの累積計算で算出（DB保存なし）
 *   - データが存在しない場合は全項目ゼロで返す（自動継承なし）
 *   - 損益計算表・借入金管理からの自動連携データを含める
 *
 * @request
 *   - params: projectId (UUID), yearMonth (YYYY-MM形式、2025-01以降)
 *   - 認証必須（authenticateミドルウェア）
 *
 * @response
 *   - 成功時: { success: true, code: '', message: 'Cash flow data retrieved successfully',
 *               data: { yearMonth, isInherited, operating, investing, financing, summary, notes } }
 *   - エラー時: { success: false, code: 'not_found', message: 'Project not found', data: null }
 *
 * @responseExample 成功例
 *   {
 *     "success": true,
 *     "code": "",
 *     "message": "Cash flow data retrieved successfully",
 *     "data": {
 *       "yearMonth": "2026-03",
 *       "isInherited": false,
 *       "operating": { "profitBeforeTax": 1200000, ... },
 *       "investing": { "capexAcquisition": -500000, ... },
 *       "financing": { "borrowingProceeds": 2000000, ... },
 *       "summary": { "netCashChange": 2610000, "cashBeginning": 500000, "cashEnding": 3110000 },
 *       "notes": { "ja": null, "en": null }
 *     }
 *   }
 *
 * @author yogomi
 * @date 2026-04-08
 */
const router = Router({ mergeParams: true });

router.get('/monthly/:yearMonth', authenticate, async (req: AuthRequest, res: Response) => {
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
      success: false,
      code: 'not_found',
      message: 'Project not found',
      data: null,
    });
    return;
  }

  const role = await getProjectRole(projectId, req.user!.id);
  if (!role) {
    res.status(403).json({
      success: false,
      code: 'forbidden',
      message: 'View permission required',
      data: null,
    });
    return;
  }

  // 自動連携データを取得（減価償却費・税引前利益・利息を一括計算）
  const { profitBeforeTax, interestExpense, depreciation } =
    await fetchProfitAndInterest(projectId, yearMonth);
  const { borrowingProceeds, loanRepaymentAmount } = await fetchBorrowingData(projectId, yearMonth);

  // スタートアップコストを取得
  const startupTotals = await fetchStartupCostTotals(projectId, yearMonth);

  // 期首残高・期末残高を 開業予定日（または2025-01）からの累積計算で算出
  const { cashBeginning, cashEnding } =
    await calculateCashBalanceUpToMonth(projectId, yearMonth);

  const record = await CashFlowMonthly.findOne({
    where: { project_id: projectId, year_month: yearMonth },
  });

  if (!record) {
    // 未保存月はゼロ初期値で返す（自動継承なし）
    // 間接法：税引前利益（利息控除済み）に減価償却費（非現金費用）を加算
    const operatingCfSubtotal =
      profitBeforeTax + depreciation + startupTotals.expense + startupTotals.initialInventory;
    const investingCfSubtotal = startupTotals.capex + startupTotals.intangible;
    const financingCfSubtotal = borrowingProceeds + loanRepaymentAmount;
    const netCashChange = operatingCfSubtotal + investingCfSubtotal + financingCfSubtotal;

    return res.json({
      success: true,
      code: '',
      message: 'Cash flow data retrieved successfully',
      data: {
        yearMonth,
        isInherited: false,
        operating: {
          profitBeforeTax,
          depreciation,
          interestExpense,
          accountsReceivableChange: 0,
          inventoryChange: 0,
          accountsPayableChange: 0,
          otherOperating: 0,
          subtotal: operatingCfSubtotal,
        },
        investing: {
          capexAcquisition: 0,
          assetSale: 0,
          intangibleAcquisition: 0,
          otherInvesting: 0,
          subtotal: investingCfSubtotal,
        },
        financing: {
          borrowingProceeds,
          loanRepayment: loanRepaymentAmount,
          capitalIncrease: 0,
          dividendPayment: 0,
          otherFinancing: 0,
          subtotal: financingCfSubtotal,
        },
        summary: {
          netCashChange,
          cashBeginning,
          cashEnding,
        },
        notes: {
          ja: null,
          en: null,
        },
        startupCostBreakdown: {
          capex: startupTotals.capex,
          intangible: startupTotals.intangible,
          expense: startupTotals.expense,
          initialInventory: startupTotals.initialInventory,
        },
      },
    });
  }

  // 既存レコードがある場合は自動連携データで上書き計算
  // depreciation は固定資産マスターから自動取得済み
  const accountsReceivableChange = Number(record.accounts_receivable_change);
  const inventoryChange = Number(record.inventory_change);
  const accountsPayableChange = Number(record.accounts_payable_change);
  const otherOperating = Number(record.other_operating);
  const capexAcquisition = Number(record.capex_acquisition);
  const assetSale = Number(record.asset_sale);
  const intangibleAcquisition = Number(record.intangible_acquisition);
  const otherInvesting = Number(record.other_investing);
  const capitalIncrease = Number(record.capital_increase);
  const dividendPayment = Number(record.dividend_payment);
  const otherFinancing = Number(record.other_financing);

  // 間接法：税引前利益（利息控除済み）に減価償却費（非現金費用）を加算し、運転資本増減を調整する
  // スタートアップコストは inventoryChange/otherOperating/capexAcquisition/intangibleAcquisition に加算
  const operatingCfSubtotal =
    profitBeforeTax + depreciation
    + accountsReceivableChange
    + inventoryChange + startupTotals.initialInventory
    + accountsPayableChange
    + otherOperating + startupTotals.expense;
  const investingCfSubtotal =
    capexAcquisition + startupTotals.capex
    + assetSale
    + intangibleAcquisition + startupTotals.intangible
    + otherInvesting;
  const financingCfSubtotal =
    borrowingProceeds + loanRepaymentAmount + capitalIncrease + dividendPayment + otherFinancing;
  const netCashChange = operatingCfSubtotal + investingCfSubtotal + financingCfSubtotal;

  res.json({
    success: true,
    code: '',
    message: 'Cash flow data retrieved successfully',
    data: {
      yearMonth,
      isInherited: false,
      operating: {
        profitBeforeTax,
        depreciation,
        interestExpense,
        accountsReceivableChange,
        inventoryChange,
        accountsPayableChange,
        otherOperating,
        subtotal: operatingCfSubtotal,
      },
      investing: {
        capexAcquisition,
        assetSale,
        intangibleAcquisition,
        otherInvesting,
        subtotal: investingCfSubtotal,
      },
      financing: {
        borrowingProceeds,
        loanRepayment: loanRepaymentAmount,
        capitalIncrease,
        dividendPayment,
        otherFinancing,
        subtotal: financingCfSubtotal,
      },
      summary: {
        netCashChange,
        cashBeginning,
        cashEnding,
      },
      notes: {
        ja: record.note_ja,
        en: record.note_en,
      },
      startupCostBreakdown: {
        capex: startupTotals.capex,
        intangible: startupTotals.intangible,
        expense: startupTotals.expense,
        initialInventory: startupTotals.initialInventory,
      },
    },
  });
});

export {
  fetchProfitAndInterest,
  fetchBorrowingData,
  calculateCashBalanceUpToMonth,
  fetchStartupCostTotals,
  fetchStartupCostMap,
};
export type { StartupCostTotals };
export default router;
