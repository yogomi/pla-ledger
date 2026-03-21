import { Router, Response } from 'express';
import { Project, SalesSimulationSnapshot } from '../../models';
import { authenticate, AuthRequest } from '../../middleware/auth';
import { getProjectRole } from '../projects/utils';
import { formatZodError } from '../../utils/zodError';
import { YearMonthSchema } from '../../schemas/salesSimulation';

/**
 * @api {DELETE} /api/projects/:projectId/sales-simulations/:yearMonth 月次売上シミュレーション削除
 * @description
 *   - 指定年月の売上シミュレーションスナップショットを削除する
 *   - 削除後は前月のスナップショットが継承される（isInherited: true）
 *   - editor 以上の権限が必要
 *
 * @request
 *   Header:
 *   - Authorization: Bearer <token> (required)
 *   Path:
 *   - projectId: string (required) - プロジェクトID
 *   - yearMonth: string (required) - 対象年月 (YYYY-MM形式)
 *
 * @response
 *   成功時: { success: true, code: '', message: 'Sales simulation deleted successfully',
 *             data: { yearMonth } }
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
 *     "message": "Sales simulation deleted successfully",
 *     "data": { "yearMonth": "2026-01" }
 *   }
 *
 * @author copilot
 * @date 2026-03-21
 */
const router = Router({ mergeParams: true });

router.delete('/:yearMonth', authenticate, async (req: AuthRequest, res: Response) => {
  const { projectId } = req.params;

  const ymParsed = YearMonthSchema.safeParse(req.params['yearMonth']);
  if (!ymParsed.success) {
    res.status(400).json({
      success: false,
      code: 'invalid_query',
      message: formatZodError(ymParsed.error),
      data: null,
    });
    return;
  }
  const yearMonth = ymParsed.data;

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

  // 該当プロジェクト・年月のスナップショットを削除
  await SalesSimulationSnapshot.destroy({
    where: { project_id: projectId, year_month: yearMonth },
  });

  res.json({
    success: true,
    code: '',
    message: 'Sales simulation deleted successfully',
    data: { yearMonth },
  });
});

export default router;
