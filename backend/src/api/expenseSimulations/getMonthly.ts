import { Router, Response } from 'express';
import { Project, FixedExpense, VariableExpense, SalesSimulationSnapshot } from '../../models';
import { authenticate, AuthRequest } from '../../middleware/auth';
import { getProjectRole } from '../projects/utils';
import { formatZodError } from '../../utils/zodError';
import { YearMonthQuerySchema } from '../../schemas/salesSimulation';
import { getPreviousSnapshot, calculateSnapshotTotals } from '../../utils/salesSimulationHelper';

/**
 * @api {GET} /api/projects/:projectId/expense-simulations/monthly 月次経費シミュレーション取得
 * @description
 *   - 指定年月の経費シミュレーションデータを取得する
 *   - 売上原価はスナップショット（継承を含む）から取得する
 *   - 固定費・変動費は当月のデータを使用する
 *   - viewer 以上の権限が必要
 *
 * @request
 *   Header:
 *   - Authorization: Bearer <token> (required)
 *   Path:
 *   - projectId: string (required) - プロジェクトID
 *   Query:
 *   - yearMonth: string (required) - 対象年月 (YYYY-MM形式)
 *   バリデーション失敗時:
 *   { success: false, code: 'invalid_query', message: エラー内容, data: null }
 *
 * @response
 *   成功時: { success: true, code: '', message: 'OK', data: { yearMonth, monthlySales, monthlyCost, fixedExpenses, fixedTotal, variableExpenses, variableTotal, totalExpense, operatingProfit } }
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
 *       "yearMonth": "2026-01",
 *       "monthlySales": 1250000,
 *       "monthlyCost": 500000,
 *       "fixedExpenses": [{ "id": "uuid", "categoryName": "人件費", "amount": 300000, "description": null }],
 *       "fixedTotal": 300000,
 *       "variableExpenses": [{ "id": "uuid", "categoryName": "減価償却費", "amount": 50000, "description": null }],
 *       "variableTotal": 50000,
 *       "totalExpense": 850000,
 *       "operatingProfit": 400000
 *     }
 *   }
 *
 * @author copilot
 * @date 2026-06-01
 */
const router = Router({ mergeParams: true });

router.get('/monthly', authenticate, async (req: AuthRequest, res: Response) => {
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

  const parsed = YearMonthQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      code: 'invalid_query',
      message: formatZodError(parsed.error),
      data: null,
    });
    return;
  }

  const { yearMonth } = parsed.data;

  // 売上スナップショット取得（継承を含む）
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

  // 固定費・変動費取得
  const fixedExpenses = await FixedExpense.findAll({
    where: { project_id: projectId, year_month: yearMonth },
  });
  const variableExpenses = await VariableExpense.findAll({
    where: { project_id: projectId, year_month: yearMonth },
  });

  const fixedTotal = fixedExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const variableTotal = variableExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const totalExpense = monthlyCost + fixedTotal + variableTotal;
  const operatingProfit = monthlySales - totalExpense;

  res.json({
    success: true,
    code: '',
    message: 'OK',
    data: {
      yearMonth,
      monthlySales,
      monthlyCost,
      fixedExpenses: fixedExpenses.map(e => ({
        id: e.id,
        categoryName: e.category_name,
        amount: Number(e.amount),
        description: e.description,
      })),
      fixedTotal,
      variableExpenses: variableExpenses.map(e => ({
        id: e.id,
        categoryName: e.category_name,
        amount: Number(e.amount),
        description: e.description,
      })),
      variableTotal,
      totalExpense,
      operatingProfit,
    },
  });
});

export default router;
