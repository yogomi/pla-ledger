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
      // 保存済み月：DBの値をそのまま使用する
      const operatingCF = Number(r.operating_cf_subtotal);
      const investingCF = Number(r.investing_cf_subtotal);
      const financingCF = Number(r.financing_cf_subtotal);
      const netCashChange = Number(r.net_cash_change);
      const cashEnding = Number(r.cash_ending);

      if (previousMonthCashEnding === null) {
        // 最初に出現した保存済み月の期首残高を期首として記録
        periodCashBeginning = Number(r.cash_beginning);
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

      const { profitBeforeTax, interestExpense } =
        await fetchProfitAndInterest(projectId, yearMonth);
      const { borrowingProceeds, loanRepaymentAmount } =
        await fetchBorrowingData(projectId, yearMonth);

      // 未保存月は手動調整項目がないため、自動連携分のみで計算する
      const operatingCF = profitBeforeTax - interestExpense;
      const financingCF = borrowingProceeds + loanRepaymentAmount;
      const netCashChange = operatingCF + financingCF; // investingCF = 0
      const cashEnding = cashBeginning + netCashChange;

      previousMonthCashEnding = cashEnding;

      months.push({
        yearMonth,
        operatingCF,
        investingCF: 0,
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
