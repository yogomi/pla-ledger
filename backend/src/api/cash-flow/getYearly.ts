import { Router, Response } from 'express';
import { Op } from 'sequelize';
import { z } from 'zod';
import { Project, CashFlowMonthly } from '../../models';
import { optionalAuthenticate, AuthRequest } from '../../middleware/auth';
import { getProjectRole } from '../projects/utils';
import { formatZodError } from '../../utils/zodError';
import { YearSchema } from '../../schemas/salesSimulation';
import {
  fetchProfitAndInterest,
  fetchBorrowingData,
  fetchTaxPayment,
  fetchStartupCostMap,
  StartupCostTotals,
} from './getMonthly';

const ParamsSchema = z.object({
  projectId: z.string().uuid(),
  year: YearSchema,
});

/**
 * @api {GET} /api/projects/:projectId/cash-flow/yearly/:year 年次キャッシュフロー取得
 * @description
 *   - 指定年の12ヶ月分のキャッシュフローデータを取得
 *   - 期首残高・期末残高は 2025-01 からの累積計算で算出（DB保存なし）
 *   - 年間合計を計算して返却
 *
 * @request
 *   - params: projectId (UUID), year (YYYY形式、2025以降)
 *   - 認証必須
 *
 * @response
 *   - 成功時: { success: true, code: '', message: 'Yearly cash flow data retrieved',
 *               data: { year, months, yearly } }
 *
 * @responseExample 成功例
 *   {
 *     "success": true,
 *     "code": "",
 *     "message": "Yearly cash flow data retrieved",
 *     "data": {
 *       "year": "2026",
 *       "months": [
 *         { "yearMonth": "2026-01", "operatingCF": 800000, "investingCF": -200000,
 *           "financingCF": 500000, "netCashChange": 1100000, "cashEnding": 1100000 },
 *         ...
 *       ],
 *       "yearly": {
 *         "totalOperatingCF": 12000000,
 *         "totalInvestingCF": -3000000,
 *         "totalFinancingCF": 5000000,
 *         "netCashChange": 14000000,
 *         "cashBeginning": 500000,
 *         "cashEnding": 14500000
 *       }
 *     }
 *   }
 *
 * @author yogomi
 * @date 2026-04-08
 */
const router = Router({ mergeParams: true });

router.get('/yearly/:year', optionalAuthenticate, async (req: AuthRequest, res: Response) => {
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
  const { projectId, year } = parsed.data;

  const project = await Project.findByPk(projectId, {
    attributes: ['planned_opening_date', 'visibility'],
  });
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

  const targetYear = Number(year);

  // 開業予定日（未設定の場合は 2025-01 をデフォルト使用）
  const startYearMonth = project.planned_opening_date ?? '2025-01';
  const [startYear, startMonth] = startYearMonth.split('-').map(Number);

  // 対象年のレコードをあらかじめ一括取得してマップ化
  const records = await CashFlowMonthly.findAll({
    where: {
      project_id: projectId,
      year_month: { [Op.like]: `${year}-%` },
    },
    order: [['year_month', 'ASC']],
  });
  const recordMap = new Map(records.map(r => [r.year_month, r]));

  // 対象年より前の月については、保存済みレコードを一括取得してマップ化する
  const prevYearEnd = `${targetYear - 1}-12`;
  const prevRecords = targetYear > startYear
    ? await CashFlowMonthly.findAll({
        where: {
          project_id: projectId,
          year_month: { [Op.between]: [startYearMonth, prevYearEnd] },
        },
        order: [['year_month', 'ASC']],
      })
    : [];
  const prevSavedMap = new Map<string, CashFlowMonthly>(
    prevRecords.map(r => [r.year_month, r]),
  );

  // スタートアップコストを一括取得してマップ化する（N+1クエリを防ぐ）
  const startupCostMap = await fetchStartupCostMap(projectId, startYearMonth, `${targetYear}-12`);
  const ZERO_TOTALS: StartupCostTotals = {
    equipment: 0, renovation: 0, deposit: 0, intangible: 0,
    founding: 0, marketing: 0, consumables: 0, initialInventory: 0,
  };

  // startYearMonth から対象年の 12 月まで残高を累積計算する
  let runningBalance = 0;
  let periodCashBeginning = runningBalance;
  const months = [];

  for (let y = startYear; y <= targetYear; y++) {
    const firstMonth = y === startYear ? startMonth : 1;
    for (let m = firstMonth; m <= 12; m++) {
      const yearMonth = `${y}-${String(m).padStart(2, '0')}`;
      const cashBeginning = runningBalance;

      let operatingCF: number;
      let investingCF: number;
      let financingCF: number;
      let taxPaymentForMonth = 0;

      const startupTotals = startupCostMap.get(yearMonth) ?? { ...ZERO_TOTALS };
      const r = y === targetYear ? recordMap.get(yearMonth) : undefined;

      if (r) {
        // 保存済み月：手動調整項目はDBから取得し、自動連携項目（損益・借入・税金）はライブ再計算する
        const { profitBeforeTax, depreciation } =
          await fetchProfitAndInterest(projectId, yearMonth);
        const { borrowingProceeds, loanRepaymentAmount } =
          await fetchBorrowingData(projectId, yearMonth);
        const taxPayment = await fetchTaxPayment(projectId, yearMonth);
        taxPaymentForMonth = taxPayment;

        // founding/marketing/consumables は profitBeforeTax に内包済みのため除外
        operatingCF =
          profitBeforeTax + depreciation + taxPayment
          + Number(r.accounts_receivable_change)
          + Number(r.inventory_change) + startupTotals.initialInventory
          + Number(r.accounts_payable_change)
          + Number(r.other_operating);
        investingCF =
          Number(r.capex_acquisition) + startupTotals.equipment + startupTotals.renovation + startupTotals.deposit
          + Number(r.asset_sale)
          + Number(r.intangible_acquisition) + startupTotals.intangible
          + Number(r.other_investing);
        financingCF =
          borrowingProceeds + loanRepaymentAmount
          + Number(r.capital_increase)
          + Number(r.dividend_payment)
          + Number(r.other_financing);
      } else if (y < targetYear && prevSavedMap.has(yearMonth)) {
        // 対象年より前の保存済み月：手動入力値はDBから取得し、自動連携項目はライブ再計算する
        const prevRecord = prevSavedMap.get(yearMonth)!;
        const { profitBeforeTax, depreciation } =
          await fetchProfitAndInterest(projectId, yearMonth);
        const { borrowingProceeds, loanRepaymentAmount } =
          await fetchBorrowingData(projectId, yearMonth);
        const taxPayment = await fetchTaxPayment(projectId, yearMonth);
        taxPaymentForMonth = taxPayment;

        // founding/marketing/consumables は profitBeforeTax に内包済みのため除外
        operatingCF =
          profitBeforeTax + depreciation + taxPayment
          + Number(prevRecord.accounts_receivable_change)
          + Number(prevRecord.inventory_change) + startupTotals.initialInventory
          + Number(prevRecord.accounts_payable_change)
          + Number(prevRecord.other_operating);
        investingCF =
          Number(prevRecord.capex_acquisition) + startupTotals.equipment + startupTotals.renovation + startupTotals.deposit
          + Number(prevRecord.asset_sale)
          + Number(prevRecord.intangible_acquisition) + startupTotals.intangible
          + Number(prevRecord.other_investing);
        financingCF =
          borrowingProceeds + loanRepaymentAmount
          + Number(prevRecord.capital_increase)
          + Number(prevRecord.dividend_payment)
          + Number(prevRecord.other_financing);
      } else {
        // 未保存月：自動連携データのみで計算する
        const { profitBeforeTax, depreciation } =
          await fetchProfitAndInterest(projectId, yearMonth);
        const { borrowingProceeds, loanRepaymentAmount } =
          await fetchBorrowingData(projectId, yearMonth);
        const taxPayment = await fetchTaxPayment(projectId, yearMonth);
        taxPaymentForMonth = taxPayment;

        // founding/marketing/consumables は profitBeforeTax に内包済みのため除外
        operatingCF =
          profitBeforeTax + depreciation + taxPayment
          + startupTotals.initialInventory;
        investingCF =
          startupTotals.equipment + startupTotals.renovation + startupTotals.deposit + startupTotals.intangible;
        financingCF = borrowingProceeds + loanRepaymentAmount;
      }

      const netCashChange = operatingCF + investingCF + financingCF;
      const cashEnding = cashBeginning + netCashChange;
      runningBalance = cashEnding;

      if (y === targetYear) {
        if (months.length === 0) {
          // 対象年の最初の月の期首残高を記録
          periodCashBeginning = cashBeginning;
        }
        months.push({
          yearMonth, operatingCF, investingCF, financingCF, netCashChange, cashEnding,
          taxPayment: taxPaymentForMonth,
          noteJa: r?.note_ja ?? null,
          noteEn: r?.note_en ?? null,
        });
      }
    }
  }

  // 年間合計
  const totalOperatingCF = months.reduce((sum, m) => sum + m.operatingCF, 0);
  const totalInvestingCF = months.reduce((sum, m) => sum + m.investingCF, 0);
  const totalFinancingCF = months.reduce((sum, m) => sum + m.financingCF, 0);
  const netCashChange = months.reduce((sum, m) => sum + m.netCashChange, 0);

  // 期首残高・期末残高
  const cashBeginning = periodCashBeginning;
  const cashEnding = months.length > 0 ? months[months.length - 1].cashEnding : cashBeginning;

  res.json({
    success: true,
    code: '',
    message: 'Yearly cash flow data retrieved',
    data: {
      year,
      months,
      yearly: {
        totalOperatingCF,
        totalInvestingCF,
        totalFinancingCF,
        netCashChange,
        cashBeginning,
        cashEnding,
      },
    },
  });
});

export default router;
