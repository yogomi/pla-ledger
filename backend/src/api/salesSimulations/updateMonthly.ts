import { Router, Response } from 'express';
import { Project, SalesSimulationSnapshot } from '../../models';
import { authenticate, AuthRequest } from '../../middleware/auth';
import { getProjectRole } from '../projects/utils';
import { formatZodError } from '../../utils/zodError';
import { YearMonthSchema, SalesSimulationUpdateSchema } from '../../schemas/salesSimulation';
import { calculateSnapshotTotals } from '../../utils/salesSimulationHelper';

/**
 * @api {PUT} /api/projects/:projectId/sales-simulations/:yearMonth 月次売上シミュレーション更新
 * @description
 *   - 指定年月の売上シミュレーションスナップショットを作成または更新する
 *   - スナップショットが存在しない場合は新規作成、存在する場合は上書き
 *   - editor 以上の権限が必要
 *
 * @request
 *   Header:
 *   - Authorization: Bearer <token> (required)
 *   Path:
 *   - projectId: string (required) - プロジェクトID
 *   - yearMonth: string (required) - 対象年月 (YYYY-MM形式)
 *   Body (JSON):
 *   - items: ItemSnapshot[] (required) - アイテムスナップショット配列
 *   バリデーション失敗時:
 *   { success: false, code: 'invalid_query', message: エラー内容, data: null }
 *
 * @response
 *   成功時: { success: true, code: '', message: 'Sales simulation updated', data: { yearMonth, monthlyTotal, monthlyCost } }
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
 *     "message": "Sales simulation updated",
 *     "data": { "yearMonth": "2026-01", "monthlyTotal": 1250000, "monthlyCost": 500000 }
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

  const parsed = SalesSimulationUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      code: 'invalid_query',
      message: formatZodError(parsed.error),
      data: null,
    });
    return;
  }

  const { items } = parsed.data;
  const { monthlyTotal, monthlyCost } = calculateSnapshotTotals(items);

  // description を string | null に正規化する
  const normalizedItems = items.map(item => ({
    ...item,
    description: item.description ?? null,
  }));

  await SalesSimulationSnapshot.upsert({
    project_id: projectId,
    year_month: yearMonth,
    items_snapshot: normalizedItems,
  }, {
    conflictFields: ['project_id', 'year_month'],
  });

  res.json({
    success: true,
    code: '',
    message: 'Sales simulation updated',
    data: { yearMonth, monthlyTotal, monthlyCost },
  });
});

export default router;
