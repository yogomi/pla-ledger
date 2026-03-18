import { Router, Response } from 'express';
import { Project, VariableExpense } from '../../models';
import { authenticate, AuthRequest } from '../../middleware/auth';
import { getProjectRole } from '../projects/utils';
import { formatZodError } from '../../utils/zodError';
import { YearMonthSchema, VariableExpensesUpdateSchema } from '../../schemas/salesSimulation';

/**
 * @api {PUT} /api/projects/:projectId/variable-expenses/:yearMonth 変動費更新
 * @description
 *   - 指定年月の変動費データを全件置換する
 *   - 既存データを削除してから新規データを一括登録する
 *   - editor 以上の権限が必要
 *
 * @request
 *   Header:
 *   - Authorization: Bearer <token> (required)
 *   Path:
 *   - projectId: string (required) - プロジェクトID
 *   - yearMonth: string (required) - 対象年月 (YYYY-MM形式)
 *   Body (JSON):
 *   - expenses: VariableExpenseItem[] (required) - 変動費アイテム配列
 *     - categoryName: string (required) - カテゴリ名
 *     - amount: number (required) - 金額
 *     - description: string | null (optional) - 説明
 *   バリデーション失敗時:
 *   { success: false, code: 'invalid_query', message: エラー内容, data: null }
 *
 * @response
 *   成功時: { success: true, code: '', message: 'Variable expenses updated', data: { yearMonth, count } }
 *   失敗時:
 *     - 400: { success: false, code: 'invalid_query', message: エラー内容, data: null }
 *     - 401: { success: false, code: 'unauthorized', message: 'No token provided', data: null }
 *     - 403: { success: false, code: 'forbidden', message: 'Edit permission required', data: null }
 *     - 404: { success: false, code: 'not_found', message: 'Project not found', data: null }
 *
 * @responseExample 成功例
 *   {
 *     "success": true,
 *     "code": "",
 *     "message": "Variable expenses updated",
 *     "data": { "yearMonth": "2026-01", "count": 2 }
 *   }
 *
 * @author copilot
 * @date 2026-06-01
 */
const router = Router({ mergeParams: true });

router.put('/:yearMonth', authenticate, async (req: AuthRequest, res: Response) => {
  const { projectId, yearMonth } = req.params;

  const ymParsed = YearMonthSchema.safeParse(yearMonth);
  if (!ymParsed.success) {
    res.status(400).json({
      success: false,
      code: 'invalid_query',
      message: formatZodError(ymParsed.error),
      data: null,
    });
    return;
  }

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
  if (!role || role === 'viewer') {
    res.status(403).json({
      success: false,
      code: 'forbidden',
      message: 'Edit permission required',
      data: null,
    });
    return;
  }

  const parsed = VariableExpensesUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      code: 'invalid_query',
      message: formatZodError(parsed.error),
      data: null,
    });
    return;
  }

  const { expenses } = parsed.data;

  // 既存データを削除して置換
  await VariableExpense.destroy({ where: { project_id: projectId, year_month: yearMonth } });
  await VariableExpense.bulkCreate(
    expenses.map(e => ({
      project_id: projectId,
      year_month: yearMonth,
      category_name: e.categoryName,
      amount: e.amount,
      description: e.description ?? null,
    })),
  );

  res.json({
    success: true,
    code: '',
    message: 'Variable expenses updated',
    data: { yearMonth, count: expenses.length },
  });
});

export default router;
