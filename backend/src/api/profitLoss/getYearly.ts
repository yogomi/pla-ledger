import { Router, Response } from 'express';
import { Op } from 'sequelize';
import {
  Project, FixedExpense, SalesSimulationSnapshot, FixedExpenseMonth,
  LoanRepayment, LaborCost, LaborCostMonth, CashFlowMonthly, StartupCost,
} from '../../models';
import { optionalAuthenticate, AuthRequest } from '../../middleware/auth';
import { getProjectRole } from '../projects/utils';
import { formatZodError } from '../../utils/zodError';
import { YearQuerySchema } from '../../schemas/salesSimulation';
import { getPreviousSnapshot, calculateSnapshotTotals } from '../../utils/salesSimulationHelper';
import { calculateMonthlyDepreciation } from '../../utils/depreciationCalculator';
import { calcLaborMonthlyTotal } from '../../utils/laborCostCalculator';

/** 月次集計データの型 */
interface MonthData {
  yearMonth: string;
  monthlySales: number;
  monthlyCost: number;
  fixedTotal: number;
  laborTotal: number;
  depreciation: number;
  startupExpenses: number;
  totalExpense: number;
  operatingProfit: number;
  interestExpense: number;
  profitBeforeTax: number;
  netProfit: number;
  profitRate: number;
  isInherited: boolean;
}

/**
 * 指定年月の月次損益データを計算する
 * @param projectId - プロジェクトID
 * @param yearMonth - 対象年月 (YYYY-MM)
 * @param interestExpenseMap - 年月→利息支払額のマップ（一括取得済み）
 * @param startupExpenseMap - 年月→費用性スタートアップコスト合計のマップ（一括取得済み）
 * @param socialInsuranceRate - 社会保険料率（%）
 * @returns 月次損益データ
 */
async function buildMonthData(
  projectId: string,
  yearMonth: string,
  interestExpenseMap: Map<string, number>,
  startupExpenseMap: Map<string, number>,
  socialInsuranceRate: number,
): Promise<MonthData> {
  let snapshot: SalesSimulationSnapshot | null = await SalesSimulationSnapshot.findOne({
    where: { project_id: projectId, year_month: yearMonth },
  });
  let isInherited = false;

  if (!snapshot) {
    snapshot = await getPreviousSnapshot(projectId, yearMonth);
    if (snapshot) {
      isInherited = true;
    }
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

  // 固定費の継承ロジック（getMonthly.ts と同一）:
  // FixedExpenseMonth レコードが存在しない（未保存）場合のみ直近の過去月を継承する
  let isFixedInherited = false;
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
        isFixedInherited = true;
      }
    }
  }

  // 人件費取得
  let laborCosts = await LaborCost.findAll({
    where: { project_id: projectId, year_month: yearMonth },
  });

  // 人件費の継承ロジック（固定費と同一）:
  // LaborCostMonth レコードが存在しない（未保存）場合のみ直近の過去月を継承する
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
  const laborTotal = laborCosts.reduce(
    (sum, lc) => sum + calcLaborMonthlyTotal(lc, socialInsuranceRate),
    0,
  );
  const depreciation = await calculateMonthlyDepreciation(projectId, yearMonth);
  // スタートアップコスト（費用性）はループ前に一括取得済みのマップから参照する（N+1クエリ回避）
  const startupExpenses = startupExpenseMap.get(yearMonth) ?? 0;
  const totalExpense = monthlyCost + fixedTotal + laborTotal + depreciation + startupExpenses;
  const operatingProfit = monthlySales - totalExpense;

  // 利息支払額：一括取得済みのマップから参照する（N+1クエリ回避）
  const interestExpense = interestExpenseMap.get(yearMonth) ?? 0;
  // 税引前利益 = 営業利益 - 利息費用
  const profitBeforeTax = operatingProfit - interestExpense;
  const netProfit = profitBeforeTax;

  const profitRate = monthlySales > 0
    ? Math.round((operatingProfit / monthlySales) * 10000) / 100
    : 0;

  return {
    yearMonth,
    monthlySales,
    monthlyCost,
    fixedTotal,
    laborTotal,
    depreciation,
    startupExpenses,
    totalExpense,
    operatingProfit,
    interestExpense,
    profitBeforeTax,
    netProfit,
    profitRate,
    isInherited: isInherited || isFixedInherited,
  };
}

/**
 * @api {GET} /api/projects/:projectId/profit-loss/yearly 年次損益取得
 * @description
 *   - 指定年の1月〜12月の損益データを一覧で取得する
 *   - 各月の売上はスナップショット（継承を含む）から計算する
 *   - 固定費・変動費は各月のデータを使用する
 *   - viewer 以上の権限が必要
 *
 * @request
 *   Header:
 *   - Authorization: Bearer <token> (required)
 *   Path:
 *   - projectId: string (required) - プロジェクトID
 *   Query:
 *   - year: string (required) - 対象年 (YYYY形式)
 *   バリデーション失敗時:
 *   { success: false, code: 'invalid_query', message: エラー内容, data: null }
 *
 * @response
 *   成功時: { success: true, code: '', message: 'OK', data: { year, months, yearly } }
 *   失敗時:
 *     - 400: { success: false, code: 'invalid_query', message: エラー内容, data: null }
 *     - 401: { success: false, code: 'unauthorized', message: 'No token provided', data: null }
 *     - 403: { success: false, code: 'forbidden', message: 'View permission required', data: null }
 *     - 404: { success: false, code: 'not_found', message: 'Project not found', data: null }
 *
 * @responseExample 成功例
 *   {
 *     "success": true,
 *     "code": "",
 *     "message": "OK",
 *     "data": {
 *       "year": "2026",
 *       "months": [
 *         {
 *           "yearMonth": "2026-01",
 *           "monthlySales": 1250000,
 *           "monthlyCost": 500000,
 *           "fixedTotal": 300000,
 *           "variableTotal": 50000,
 *           "totalExpense": 850000,
 *           "operatingProfit": 400000,
 *           "profitRate": 32.0,
 *           "isInherited": false
 *         }
 *       ],
 *       "yearly": {
 *         "totalSales": 15000000,
 *         "totalCost": 6000000,
 *         "totalFixed": 3600000,
 *         "totalVariable": 600000,
 *         "totalExpense": 10200000,
 *         "totalOperatingProfit": 4800000,
 *         "averageProfitRate": 32.0
 *       }
 *     }
 *   }
 *
 * @author copilot
 * @date 2026-06-01
 */
const router = Router({ mergeParams: true });

router.get('/yearly', optionalAuthenticate, async (req: AuthRequest, res: Response) => {
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

  const parsed = YearQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      code: 'invalid_query',
      message: formatZodError(parsed.error),
      data: null,
    });
    return;
  }

  const { year } = parsed.data;
  const socialInsuranceRate = Number(project.social_insurance_rate);

  // 年間の利息支払額を一括取得してマップに持つ（N+1クエリ回避）
  const yearlyRepayments = await LoanRepayment.findAll({
    attributes: ['year_month', 'interest_payment'],
    where: {
      project_id: projectId,
      year_month: { [Op.like]: `${year}-%` },
    },
  });

  const interestExpenseMap = new Map<string, number>();
  for (const r of yearlyRepayments) {
    const prev = interestExpenseMap.get(r.year_month) ?? 0;
    interestExpenseMap.set(r.year_month, prev + Number(r.interest_payment));
  }

  // キャッシュフローメモを一括取得（N+1クエリ回避）
  const cashFlowRecords = await CashFlowMonthly.findAll({
    attributes: ['year_month', 'note_ja', 'note_en'],
    where: {
      project_id: projectId,
      year_month: { [Op.like]: `${year}-%` },
    },
  });
  const noteMap = new Map<string, { noteJa: string | null; noteEn: string | null }>(
    cashFlowRecords.map(r => [r.year_month, { noteJa: r.note_ja ?? null, noteEn: r.note_en ?? null }]),
  );

  // 費用性スタートアップコストを一括取得してマップ化する（N+1クエリ回避）
  const startupCostRecords = await StartupCost.findAll({
    attributes: ['allocation_month', 'quantity', 'unit_price'],
    where: {
      project_id: projectId,
      allocation_month: { [Op.like]: `${year}-%` },
      cost_type: { [Op.in]: ['founding', 'marketing', 'consumables'] },
    },
  });
  const startupExpenseMap = new Map<string, number>();
  for (const c of startupCostRecords) {
    const prev = startupExpenseMap.get(c.allocation_month) ?? 0;
    startupExpenseMap.set(c.allocation_month, prev + Number(c.quantity) * Number(c.unit_price));
  }

  // 1月〜12月の月次データを順次計算
  const months: Array<MonthData & { noteJa: string | null; noteEn: string | null }> = [];
  for (let m = 1; m <= 12; m++) {
    const yearMonth = `${year}-${String(m).padStart(2, '0')}`;
    const monthData = await buildMonthData(
      projectId, yearMonth, interestExpenseMap, startupExpenseMap, socialInsuranceRate,
    );
    const notes = noteMap.get(yearMonth) ?? { noteJa: null, noteEn: null };
    months.push({ ...monthData, noteJa: notes.noteJa, noteEn: notes.noteEn });
  }

  // 年間集計
  const totalSales = months.reduce((sum, m) => sum + m.monthlySales, 0);
  const totalCost = months.reduce((sum, m) => sum + m.monthlyCost, 0);
  const totalFixed = months.reduce((sum, m) => sum + m.fixedTotal, 0);
  const totalLabor = months.reduce((sum, m) => sum + m.laborTotal, 0);
  const totalDepreciation = months.reduce((sum, m) => sum + m.depreciation, 0);
  const totalStartupExpenses = months.reduce((sum, m) => sum + m.startupExpenses, 0);
  const totalExpense = months.reduce((sum, m) => sum + m.totalExpense, 0);
  const totalOperatingProfit = months.reduce((sum, m) => sum + m.operatingProfit, 0);
  const totalInterestExpense = months.reduce((sum, m) => sum + m.interestExpense, 0);
  const totalProfitBeforeTax = months.reduce((sum, m) => sum + m.profitBeforeTax, 0);
  const totalNetProfit = months.reduce((sum, m) => sum + m.netProfit, 0);
  const averageProfitRate = totalSales > 0
    ? Math.round((totalOperatingProfit / totalSales) * 10000) / 100
    : 0;

  res.json({
    success: true,
    code: '',
    message: 'OK',
    data: {
      year,
      months,
      yearly: {
        totalSales,
        totalCost,
        totalFixed,
        totalLabor,
        totalDepreciation,
        totalStartupExpenses,
        totalExpense,
        totalOperatingProfit,
        totalInterestExpense,
        totalProfitBeforeTax,
        totalNetProfit,
        averageProfitRate,
      },
    },
  });
});

export default router;
