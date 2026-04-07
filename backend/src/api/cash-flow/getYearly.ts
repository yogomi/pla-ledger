import { Router, Response } from 'express';
import { Op } from 'sequelize';
import { z } from 'zod';
import { Project, CashFlowMonthly } from '../../models';
import { authenticate, AuthRequest } from '../../middleware/auth';
import { getProjectRole } from '../projects/utils';
import { formatZodError } from '../../utils/zodError';
import { YearSchema } from '../../schemas/salesSimulation';
import { fetchProfitAndInterest, fetchBorrowingData, fetchPrevCashEnding } from './getMonthly';

const ParamsSchema = z.object({
  projectId: z.string().uuid(),
  year: YearSchema,
});

/**
 * @api {GET} /api/projects/:projectId/cash-flow/yearly/:year 年次キャッシュフロー取得
 * @description
 *   - 指定年の12ヶ月分のキャッシュフローデータを取得
 *   - 年間合計を計算して返却
 *
 * @request
 *   - params: projectId (UUID), year (YYYY形式)
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
 * @date 2026-03-21
 */
const router = Router({ mergeParams: true });

router.get('/yearly/:year', authenticate, async (req: AuthRequest, res: Response) => {
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

  // 指定年の全月データを一括取得
  const records = await CashFlowMonthly.findAll({
    where: {
      project_id: projectId,
      year_month: { [Op.like]: `${year}-%` },
    },
    order: [['year_month', 'ASC']],
  });

  // year_month をキーにマップ化
  const recordMap = new Map(records.map(r => [r.year_month, r]));

  // 12ヶ月分のデータを生成
  // 保存済み月はDBの値を使用し、未保存月は損益・借入データから自動計算する
  const months = [];
  let previousMonthCashEnding: number | null = null;
  let periodCashBeginning = 0;

  for (let m = 1; m <= 12; m++) {
    const yearMonth = `${year}-${String(m).padStart(2, '0')}`;
    const r = recordMap.get(yearMonth);

    if (r) {
      // 保存済み月：手動調整項目はDBから取得し、自動連携項目（損益・借入）はライブ再計算する
      // ※ getMonthly.ts と同一ロジックで常に最新の借入管理・損益データを反映する
      const { profitBeforeTax, interestExpense, depreciation } =
        await fetchProfitAndInterest(projectId, yearMonth);
      const { borrowingProceeds, loanRepaymentAmount } =
        await fetchBorrowingData(projectId, yearMonth);
      const accountsReceivableChange = Number(r.accounts_receivable_change);
      const inventoryChange = Number(r.inventory_change);
      const accountsPayableChange = Number(r.accounts_payable_change);
      const otherOperating = Number(r.other_operating);
      const capexAcquisition = Number(r.capex_acquisition);
      const assetSale = Number(r.asset_sale);
      const intangibleAcquisition = Number(r.intangible_acquisition);
      const otherInvesting = Number(r.other_investing);
      const capitalIncrease = Number(r.capital_increase);
      const dividendPayment = Number(r.dividend_payment);
      const otherFinancing = Number(r.other_financing);

      // 間接法：税引前利益（利息控除済み）に減価償却費（非現金費用）を加算し、運転資本増減を調整する
      const operatingCF =
        profitBeforeTax + depreciation
        + accountsReceivableChange + inventoryChange + accountsPayableChange + otherOperating;
      const investingCF = capexAcquisition + assetSale + intangibleAcquisition + otherInvesting;
      const financingCF =
        borrowingProceeds + loanRepaymentAmount + capitalIncrease + dividendPayment + otherFinancing;
      const netCashChange = operatingCF + investingCF + financingCF;

      // 期首残高はDBの値（ユーザーが手動設定している可能性があるため）
      const cashBeginning = Number(r.cash_beginning);
      const cashEnding = cashBeginning + netCashChange;

      if (previousMonthCashEnding === null) {
        // 最初に出現した保存済み月の期首残高を年間期首として記録
        periodCashBeginning = cashBeginning;
      }
      previousMonthCashEnding = cashEnding;

      months.push({ yearMonth, operatingCF, investingCF, financingCF, netCashChange, cashEnding });
    } else {
      // 未保存月：損益計算書・借入管理データから自動計算する
      let cashBeginning: number;
      if (previousMonthCashEnding !== null) {
        cashBeginning = previousMonthCashEnding;
      } else {
        // この月より前に保存済み月がない場合は前期末残高を期首とする
        cashBeginning = await fetchPrevCashEnding(projectId, yearMonth);
        periodCashBeginning = cashBeginning;
      }

      const { profitBeforeTax, depreciation } =
        await fetchProfitAndInterest(projectId, yearMonth);
      const { borrowingProceeds, loanRepaymentAmount } =
        await fetchBorrowingData(projectId, yearMonth);

      // 未保存月は手動調整項目がないため、自動連携分のみで計算する
      // 間接法：税引前利益（利息控除済み）に減価償却費（非現金費用）を加算
      const operatingCF = profitBeforeTax + depreciation;
      const investingCF = 0;
      const financingCF = borrowingProceeds + loanRepaymentAmount;
      const netCashChange = operatingCF + investingCF + financingCF;
      const cashEnding = cashBeginning + netCashChange;

      previousMonthCashEnding = cashEnding;

      months.push({
        yearMonth,
        operatingCF,
        investingCF,
        financingCF,
        netCashChange,
        cashEnding,
      });
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
