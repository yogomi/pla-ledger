import { Router, Response } from 'express';
import { Op } from 'sequelize';
import {
  Project, FixedExpense, FixedExpenseMonth,
  LaborCost, LaborCostMonth,
} from '../../models';
import { optionalAuthenticate, AuthRequest } from '../../middleware/auth';
import { getProjectRole } from '../projects/utils';
import { formatZodError } from '../../utils/zodError';
import { YearQuerySchema } from '../../schemas/salesSimulation';
import { calcLaborMonthlyTotal } from '../../utils/laborCostCalculator';

/**
 * @api {GET} /api/projects/:projectId/expense-simulations/yearly 年次経費シミュレーション取得
 * @description
 *   - 指定年の1月〜12月の経費データをカテゴリ別に集計して返す
 *   - 固定費・人件費は未保存月のみ直近の過去月を継承する
 *   - 変動費は継承しない
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
 *   成功時: { success: true, code: '', message: 'OK', data: { year, fixedByCategory,
 *             laborMonths, monthlyTotals, yearlyTotals } }
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
 *       "fixedByCategory": [
 *         {
 *           "categoryName": "家賃",
 *           "months": [{ "yearMonth": "2026-01", "amount": 200000 }],
 *           "yearlyTotal": 2400000
 *         }
 *       ],
 *       "variableByCategory": [...],
 *       "laborMonths": [{ "yearMonth": "2026-01", "amount": 500000 }],
 *       "monthlyTotals": [
 *         {
 *           "yearMonth": "2026-01",
 *           "fixedTotal": 200000,
 *           "variableTotal": 100000,
 *           "laborTotal": 500000,
 *           "totalExpense": 800000
 *         }
 *       ],
 *       "yearlyTotals": {
 *         "totalFixed": 2400000,
 *         "totalVariable": 1200000,
 *         "totalLabor": 6000000,
 *         "totalExpense": 9600000
 *       }
 *     }
 *   }
 *
 * @author copilot
 * @date 2026-04-01
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

  // カテゴリ別集計マップ: categoryName -> { yearMonth: amount }
  const fixedMap = new Map<string, Map<string, number>>();

  // 月次人件費合計: yearMonth -> amount
  const laborMonthMap = new Map<string, number>();

  // 人件費 type 別集計マップ: type -> { yearMonth: amount }
  const laborTypeMap = new Map<string, Map<string, number>>();

  // 月次合計: yearMonth -> { fixedTotal, laborTotal }
  const monthlyTotals: Array<{
    yearMonth: string;
    fixedTotal: number;
    laborTotal: number;
    totalExpense: number;
  }> = [];

  for (let m = 1; m <= 12; m++) {
    const yearMonth = `${year}-${String(m).padStart(2, '0')}`;

    // 固定費取得（継承ロジック）
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

    // 人件費取得（継承ロジック）
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

    // 固定費をカテゴリ別に集計する
    for (const e of fixedExpenses) {
      const name = e.category_name;
      if (!fixedMap.has(name)) fixedMap.set(name, new Map());
      const prev = fixedMap.get(name)!.get(yearMonth) ?? 0;
      fixedMap.get(name)!.set(yearMonth, prev + Number(e.amount));
    }

    let laborTotal = 0;
    for (const lc of laborCosts) {
      const amount = calcLaborMonthlyTotal(lc, socialInsuranceRate);
      laborTotal += amount;
      if (!laborTypeMap.has(lc.type)) laborTypeMap.set(lc.type, new Map());
      const prev = laborTypeMap.get(lc.type)!.get(yearMonth) ?? 0;
      laborTypeMap.get(lc.type)!.set(yearMonth, prev + amount);
    }
    laborMonthMap.set(yearMonth, laborTotal);

    const fixedTotal = fixedExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const totalExpense = fixedTotal + laborTotal;
    monthlyTotals.push({ yearMonth, fixedTotal, laborTotal, totalExpense });
  }

  // 全月リストを生成する
  const allMonths = Array.from({ length: 12 }, (_, i) => {
    const m = String(i + 1).padStart(2, '0');
    return `${year}-${m}`;
  });

  // 固定費カテゴリ別に整形する
  const fixedByCategory = Array.from(fixedMap.entries()).map(([categoryName, monthMap]) => {
    const months = allMonths.map(yearMonth => ({
      yearMonth,
      amount: monthMap.get(yearMonth) ?? 0,
    }));
    const yearlyTotal = months.reduce((sum, m) => sum + m.amount, 0);
    return { categoryName, months, yearlyTotal };
  });

  // 人件費月次を整形する
  const laborMonths = allMonths.map(yearMonth => ({
    yearMonth,
    amount: laborMonthMap.get(yearMonth) ?? 0,
  }));

  // 人件費 type 別に整形する
  const typeOrder = ['owner_salary', 'full_time', 'part_time'];
  const laborByType = typeOrder
    .filter(type => laborTypeMap.has(type))
    .map(type => {
      const monthMap = laborTypeMap.get(type)!;
      const months = allMonths.map(yearMonth => ({
        yearMonth,
        amount: monthMap.get(yearMonth) ?? 0,
      }));
      const yearlyTotal = months.reduce((sum, m) => sum + m.amount, 0);
      return { categoryName: type, months, yearlyTotal };
    });

  // 年間合計
  const totalFixed = monthlyTotals.reduce((sum, m) => sum + m.fixedTotal, 0);
  const totalLabor = monthlyTotals.reduce((sum, m) => sum + m.laborTotal, 0);
  const totalExpense = totalFixed + totalLabor;

  res.json({
    success: true,
    code: '',
    message: 'OK',
    data: {
      year,
      fixedByCategory,
      laborMonths,
      laborByType,
      monthlyTotals,
      yearlyTotals: { totalFixed, totalLabor, totalExpense },
    },
  });
});

export default router;
