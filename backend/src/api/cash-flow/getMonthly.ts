import { Router, Response } from 'express';
import { Op } from 'sequelize';
import {
  Project, CashFlowMonthly, LoanRepayment, Loan,
  SalesSimulationSnapshot, FixedExpense, VariableExpense, LaborCost, LaborCostMonth, FixedExpenseMonth,
} from '../../models';
import { authenticate, AuthRequest } from '../../middleware/auth';
import { getProjectRole } from '../projects/utils';
import { formatZodError } from '../../utils/zodError';
import { YearMonthSchema } from '../../schemas/salesSimulation';
import { z } from 'zod';
import { getPreviousSnapshot, calculateSnapshotTotals } from '../../utils/salesSimulationHelper';

const ParamsSchema = z.object({
  projectId: z.string().uuid(),
  yearMonth: YearMonthSchema,
});

/**
 * 指定月のtaxBefore利益と利息支払額を損益計算表ロジックで計算する。
 * @param projectId - プロジェクトID
 * @param yearMonth - 対象年月 (YYYY-MM)
 */
async function fetchProfitAndInterest(
  projectId: string,
  yearMonth: string,
): Promise<{ profitBeforeTax: number; interestExpense: number }> {
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
  const laborTotal = laborCosts.reduce((sum, lc) => sum + Number(lc.monthly_total), 0);
  const totalExpense = monthlyCost + fixedTotal + variableTotal + laborTotal;
  const operatingProfit = monthlySales - totalExpense;

  // 利息支払額：当月の返済スケジュールから集計する
  const repayments = await LoanRepayment.findAll({
    where: { project_id: projectId, year_month: yearMonth },
    attributes: ['interest_payment'],
  });
  const interestExpense = repayments.reduce((sum, r) => sum + Number(r.interest_payment), 0);

  // 税引前当期純利益 = 営業利益（利息控除前）
  const profitBeforeTax = operatingProfit;

  return { profitBeforeTax, interestExpense };
}

/**
 * 当月の借入実行額と返済額を借入管理から集計する。
 * @param projectId - プロジェクトID
 * @param yearMonth - 対象年月 (YYYY-MM)
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

/**
 * 前月のcash_endingを今月のcash_beginningとして取得する。
 * @param projectId - プロジェクトID
 * @param yearMonth - 対象年月 (YYYY-MM)
 */
async function fetchPrevCashEnding(projectId: string, yearMonth: string): Promise<number> {
  const [year, month] = yearMonth.split('-').map(Number);
  const prevDate = new Date(year, month - 2, 1);
  const prevYearMonth =
    `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

  const prev = await CashFlowMonthly.findOne({
    where: { project_id: projectId, year_month: prevYearMonth },
    attributes: ['cash_ending'],
  });
  return prev ? Number(prev.cash_ending) : 0;
}

/**
 * @api {GET} /api/projects/:projectId/cash-flow/monthly/:yearMonth 月次キャッシュフロー取得
 * @description
 *   - 指定月のキャッシュフローデータを取得
 *   - データが存在しない場合は前月データを継承（is_inherited: true）
 *   - 損益計算表・借入金管理からの自動連携データを含める
 *
 * @request
 *   - params: projectId (UUID), yearMonth (YYYY-MM形式)
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
 * @date 2026-03-21
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

  // 自動連携データを取得
  const { profitBeforeTax, interestExpense } = await fetchProfitAndInterest(projectId, yearMonth);
  const { borrowingProceeds, loanRepaymentAmount } = await fetchBorrowingData(projectId, yearMonth);

  let record = await CashFlowMonthly.findOne({
    where: { project_id: projectId, year_month: yearMonth },
  });

  let isInherited = false;
  if (!record) {
    // 前月データを継承
    const [year, month] = yearMonth.split('-').map(Number);
    const prevDate = new Date(year, month - 2, 1);
    const prevYearMonth =
      `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
    const prevRecord = await CashFlowMonthly.findOne({
      where: { project_id: projectId, year_month: prevYearMonth },
    });

    const cashBeginning = prevRecord ? Number(prevRecord.cash_ending) : 0;

    // 自動計算
    const operatingCfSubtotal =
      profitBeforeTax
      + 0          // depreciation（デフォルト0）
      - interestExpense
      + 0          // accounts_receivable_change
      + 0          // inventory_change
      + 0          // accounts_payable_change
      + 0;         // other_operating
    const investingCfSubtotal = 0;
    const financingCfSubtotal = borrowingProceeds + loanRepaymentAmount + 0 + 0 + 0;
    const netCashChange = operatingCfSubtotal + investingCfSubtotal + financingCfSubtotal;
    const cashEnding = cashBeginning + netCashChange;

    return res.json({
      success: true,
      code: '',
      message: 'Cash flow data retrieved successfully',
      data: {
        yearMonth,
        isInherited: !!prevRecord,
        operating: {
          profitBeforeTax,
          depreciation: prevRecord ? Number(prevRecord.depreciation) : 0,
          interestExpense,
          accountsReceivableChange: prevRecord
            ? Number(prevRecord.accounts_receivable_change) : 0,
          inventoryChange: prevRecord ? Number(prevRecord.inventory_change) : 0,
          accountsPayableChange: prevRecord ? Number(prevRecord.accounts_payable_change) : 0,
          otherOperating: prevRecord ? Number(prevRecord.other_operating) : 0,
          subtotal: operatingCfSubtotal,
        },
        investing: {
          capexAcquisition: prevRecord ? Number(prevRecord.capex_acquisition) : 0,
          assetSale: prevRecord ? Number(prevRecord.asset_sale) : 0,
          intangibleAcquisition: prevRecord ? Number(prevRecord.intangible_acquisition) : 0,
          otherInvesting: prevRecord ? Number(prevRecord.other_investing) : 0,
          subtotal: investingCfSubtotal,
        },
        financing: {
          borrowingProceeds,
          loanRepayment: loanRepaymentAmount,
          capitalIncrease: prevRecord ? Number(prevRecord.capital_increase) : 0,
          dividendPayment: prevRecord ? Number(prevRecord.dividend_payment) : 0,
          otherFinancing: prevRecord ? Number(prevRecord.other_financing) : 0,
          subtotal: financingCfSubtotal,
        },
        summary: {
          netCashChange,
          cashBeginning,
          cashEnding,
        },
        notes: {
          ja: prevRecord ? prevRecord.note_ja : null,
          en: prevRecord ? prevRecord.note_en : null,
        },
      },
    });
  }

  // 既存レコードがある場合は自動連携データで上書き計算
  const depreciation = Number(record.depreciation);
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
  const cashBeginning = Number(record.cash_beginning);

  const operatingCfSubtotal =
    profitBeforeTax + depreciation - interestExpense
    + accountsReceivableChange + inventoryChange + accountsPayableChange + otherOperating;
  const investingCfSubtotal =
    capexAcquisition + assetSale + intangibleAcquisition + otherInvesting;
  const financingCfSubtotal =
    borrowingProceeds + loanRepaymentAmount + capitalIncrease + dividendPayment + otherFinancing;
  const netCashChange = operatingCfSubtotal + investingCfSubtotal + financingCfSubtotal;
  const cashEnding = cashBeginning + netCashChange;

  res.json({
    success: true,
    code: '',
    message: 'Cash flow data retrieved successfully',
    data: {
      yearMonth,
      isInherited,
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
    },
  });
});

export { fetchProfitAndInterest, fetchBorrowingData, fetchPrevCashEnding };
export default router;
