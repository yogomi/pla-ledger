import { Router, Response } from 'express';
import { Op } from 'sequelize';
import {
  Project, SalesSimulationSnapshot, FixedExpense, FixedExpenseMonth,
  LaborCost, LaborCostMonth, LoanRepayment, StartupCost,
} from '../../models';
import { optionalAuthenticate, AuthRequest } from '../../middleware/auth';
import { getProjectRole } from '../projects/utils';
import { getPreviousSnapshot, calculateSnapshotTotals } from '../../utils/salesSimulationHelper';
import { calculateMonthlyDepreciation } from '../../utils/depreciationCalculator';
import { calcLaborMonthlyTotal } from '../../utils/laborCostCalculator';
import {
  buildFiscalPeriods,
  calcCorporateTax,
  parseTaxRates,
  DEFAULT_TAX_RATES,
  FiscalPeriod,
  CorporateTaxBreakdown,
} from '../../utils/corporateTaxCalculator';

/**
 * @api {GET} /api/projects/:projectId/profit-loss/fiscal-summary 事業年度別税計算サマリー取得
 * @description
 *   - プロジェクトの開業月・決算月をもとに事業年度を生成し、各期の課税所得と法人税等を計算する
 *   - tax_calculation_enabled が false の場合は enabled: false を返す
 *   - 計算対象は開業月から6期分（変更予定に対応できる期間）
 *   - viewer 以上の権限が必要
 *
 * @request
 *   Header:
 *   - Authorization: Bearer <token> (optional)
 *   Path:
 *   - projectId: string (required)
 *
 * @response
 *   成功時:
 *     { success: true, code: '', message: 'OK',
 *       data: { enabled: false } }
 *     または
 *     { success: true, code: '', message: 'OK',
 *       data: { enabled: true, fiscalYears: [...] } }
 *
 * @author Makoto Yano
 * @date 2026-05-03
 */
const router = Router({ mergeParams: true });

/**
 * 指定事業年度の税引前利益合計を計算する。
 * 期間内の各月を走査し、損益計算書と同じロジックで集計する。
 */
async function calcFiscalPeriodIncome(
  projectId: string,
  period: FiscalPeriod,
  socialInsuranceRate: number,
): Promise<number> {
  // 事業年度内の全月リストを生成
  const months: string[] = [];
  let cur = period.start;
  while (cur <= period.end) {
    months.push(cur);
    const [y, m] = cur.split('-').map(Number);
    const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
    cur = next;
  }

  // 利息支払額を一括取得
  const repayments = await LoanRepayment.findAll({
    attributes: ['year_month', 'interest_payment'],
    where: {
      project_id: projectId,
      year_month: { [Op.between]: [period.start, period.end] },
    },
  });
  const interestMap = new Map<string, number>();
  for (const r of repayments) {
    interestMap.set(r.year_month, (interestMap.get(r.year_month) ?? 0) + Number(r.interest_payment));
  }

  // 事業年度内の費用性スタートアップコストを一括取得（N+1クエリ回避）
  const startupCostsAll = await StartupCost.findAll({
    where: {
      project_id: projectId,
      allocation_month: { [Op.between]: [period.start, period.end] },
      cost_type: { [Op.in]: ['founding', 'marketing', 'consumables'] },
    },
  });
  const startupByMonth = new Map<string, number>();
  for (const c of startupCostsAll) {
    const prev = startupByMonth.get(c.allocation_month) ?? 0;
    startupByMonth.set(c.allocation_month, prev + Number(c.quantity) * Number(c.unit_price));
  }

  let totalProfitBeforeTax = 0;

  for (const yearMonth of months) {
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
      const saved = await FixedExpenseMonth.findOne({
        where: { project_id: projectId, year_month: yearMonth },
      });
      if (!saved) {
        const recent = await FixedExpense.findOne({
          where: { project_id: projectId, year_month: { [Op.lt]: yearMonth } },
          order: [['year_month', 'DESC']],
        });
        if (recent) {
          fixedExpenses = await FixedExpense.findAll({
            where: { project_id: projectId, year_month: recent.year_month },
          });
        }
      }
    }

    let laborCosts = await LaborCost.findAll({
      where: { project_id: projectId, year_month: yearMonth },
    });
    if (laborCosts.length === 0) {
      const saved = await LaborCostMonth.findOne({
        where: { project_id: projectId, year_month: yearMonth },
      });
      if (!saved) {
        const recent = await LaborCost.findOne({
          where: { project_id: projectId, year_month: { [Op.lt]: yearMonth } },
          order: [['year_month', 'DESC']],
        });
        if (recent) {
          laborCosts = await LaborCost.findAll({
            where: { project_id: projectId, year_month: recent.year_month },
          });
        }
      }
    }

    const fixedTotal = fixedExpenses.reduce((s, e) => s + Number(e.amount), 0);
    const laborTotal = laborCosts.reduce(
      (s, lc) => s + calcLaborMonthlyTotal(lc, socialInsuranceRate),
      0,
    );
    const depreciation = await calculateMonthlyDepreciation(projectId, yearMonth);
    // スタートアップコスト（費用性）をP&Lに反映
    const startupExpenseThisMonth = startupByMonth.get(yearMonth) ?? 0;
    const totalExpense = monthlyCost + fixedTotal + laborTotal + depreciation + startupExpenseThisMonth;
    const operatingProfit = monthlySales - totalExpense;
    const interestExpense = interestMap.get(yearMonth) ?? 0;
    totalProfitBeforeTax += operatingProfit - interestExpense;
  }

  return totalProfitBeforeTax;
}

router.get('/fiscal-summary', optionalAuthenticate, async (req: AuthRequest, res: Response) => {
  const { projectId } = req.params;

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

  const role = await getProjectRole(projectId, req.user?.id);
  if (project.visibility !== 'public' && !role) {
    res.status(403).json({
      success: false,
      code: 'forbidden',
      message: 'View permission required',
      data: null,
    });
    return;
  }

  if (!project.tax_calculation_enabled) {
    res.json({
      success: true,
      code: '',
      message: 'OK',
      data: { enabled: false, fiscalYears: [] },
    });
    return;
  }

  const openingYearMonth = project.planned_opening_date ?? '2025-01';
  const fiscalEndMonth = Number(project.fiscal_end_month);
  const taxRates = parseTaxRates(project.tax_rates) ?? DEFAULT_TAX_RATES;
  const socialInsuranceRate = Number(project.social_insurance_rate);

  // 6期分を計算（事業計画の標準的な計画期間）
  const periods = buildFiscalPeriods(openingYearMonth, fiscalEndMonth, 6);

  const fiscalYears: Array<{
    label: string;
    start: string;
    end: string;
    paymentMonth: string;
    taxableIncome: number;
    breakdown: CorporateTaxBreakdown;
  }> = [];

  for (const period of periods) {
    const taxableIncome = await calcFiscalPeriodIncome(projectId, period, socialInsuranceRate);
    const breakdown = calcCorporateTax(taxableIncome, taxRates);
    fiscalYears.push({
      label: period.label,
      start: period.start,
      end: period.end,
      paymentMonth: period.paymentMonth,
      taxableIncome: Math.round(taxableIncome),
      breakdown,
    });
  }

  res.json({
    success: true,
    code: '',
    message: 'OK',
    data: { enabled: true, fiscalYears },
  });
});

export default router;
