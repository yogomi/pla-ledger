import { Router, Response } from 'express';
import { Project, SalesSimulationSnapshot } from '../../models';
import { optionalAuthenticate, AuthRequest } from '../../middleware/auth';
import { getProjectRole } from '../projects/utils';
import { formatZodError } from '../../utils/zodError';
import { YearMonthQuerySchema } from '../../schemas/salesSimulation';
import {
  getPreviousSnapshot,
  getNextSnapshot,
  diffMonths,
} from '../../utils/salesSimulationHelper';

/**
 * @api {GET} /api/projects/:projectId/sales-simulations/interpolate-preview 補間プレビュー取得
 * @description
 *   - 指定月の前後の登録済みスナップショットから線形補間した品目データを返す
 *   - itemId が前後両方に存在する品目は unitPrice/quantity/operatingDays/monthlyQuantity を補間
 *   - 前だけに存在する品目は前の値をそのまま返す（後だけに存在する品目は対象外）
 *   - costRate/calculationType/カテゴリ情報は前のスナップショットから引き継ぐ
 *   - 既に指定月のスナップショットが存在する場合は available: false を返す（補間で上書きは想定しない）
 *   - viewer 以上の権限が必要
 *
 * @request
 *   Header:
 *   - Authorization: Bearer <token> (optional, プロジェクトが public でない場合は必須)
 *   Path:
 *   - projectId: string (required) - プロジェクトID
 *   Query:
 *   - yearMonth: string (required) - 対象年月 (YYYY-MM形式)
 *   バリデーション失敗時:
 *   { success: false, code: 'invalid_query', message: エラー内容, data: null }
 *
 * @response
 *   成功時: { success: true, code: '', message: 'OK', data: {
 *     available, reason, prevYearMonth, nextYearMonth, items
 *   }}
 *   失敗時:
 *     - 400: { success: false, code: 'invalid_query', message: エラー内容, data: null }
 *     - 401: { success: false, code: 'unauthorized', message: 'No token provided', data: null }
 *     - 403: { success: false, code: 'forbidden', message: 'View permission required', data: null }
 *     - 404: { success: false, code: 'not_found', message: 'Project not found', data: null }
 *
 * @responseExample 補間可能な例
 *   {
 *     "success": true,
 *     "code": "",
 *     "message": "OK",
 *     "data": {
 *       "available": true,
 *       "reason": null,
 *       "prevYearMonth": "2026-01",
 *       "nextYearMonth": "2026-06",
 *       "items": [ { "itemId": "uuid", ... } ]
 *     }
 *   }
 *
 * @responseExample 補間不可能な例
 *   {
 *     "success": true,
 *     "code": "",
 *     "message": "OK",
 *     "data": {
 *       "available": false,
 *       "reason": "no_next",
 *       "prevYearMonth": "2026-01",
 *       "nextYearMonth": null,
 *       "items": []
 *     }
 *   }
 *
 * @author copilot
 * @date 2026-05-23
 */
const router = Router({ mergeParams: true });

router.get('/interpolate-preview', optionalAuthenticate, async (req: AuthRequest, res: Response) => {
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

  // 既に当該月のスナップショットが存在する場合は補間で上書きを想定しないため available: false を返す
  const existing = await SalesSimulationSnapshot.findOne({
    where: { project_id: projectId, year_month: yearMonth },
  });
  if (existing) {
    res.json({
      success: true,
      code: '',
      message: 'OK',
      data: {
        available: false,
        reason: 'already_exists',
        prevYearMonth: null,
        nextYearMonth: null,
        items: [],
      },
    });
    return;
  }

  // 前後の登録済みスナップショットを取得する
  const prevSnapshot = await getPreviousSnapshot(projectId, yearMonth);
  const nextSnapshot = await getNextSnapshot(projectId, yearMonth);

  if (!prevSnapshot) {
    res.json({
      success: true,
      code: '',
      message: 'OK',
      data: {
        available: false,
        reason: 'no_previous',
        prevYearMonth: null,
        nextYearMonth: nextSnapshot?.year_month ?? null,
        items: [],
      },
    });
    return;
  }

  if (!nextSnapshot) {
    res.json({
      success: true,
      code: '',
      message: 'OK',
      data: {
        available: false,
        reason: 'no_next',
        prevYearMonth: prevSnapshot.year_month,
        nextYearMonth: null,
        items: [],
      },
    });
    return;
  }

  // 進捗率を月差で計算する (target - prev) / (next - prev)
  const totalSpan = diffMonths(prevSnapshot.year_month, nextSnapshot.year_month);
  const progress = totalSpan > 0
    ? diffMonths(prevSnapshot.year_month, yearMonth) / totalSpan
    : 0;

  // 前後のスナップショットを itemId で対応付けて補間する
  const nextItemMap = new Map(nextSnapshot.items_snapshot.map(i => [i.itemId, i]));

  const interpolatedItems = prevSnapshot.items_snapshot.map(prevItem => {
    const nextItem = nextItemMap.get(prevItem.itemId);
    if (!nextItem) {
      return prevItem;
    }
    return {
      ...prevItem,
      unitPrice: Math.round(prevItem.unitPrice + (nextItem.unitPrice - prevItem.unitPrice) * progress),
      quantity: Math.round(prevItem.quantity + (nextItem.quantity - prevItem.quantity) * progress),
      operatingDays: Math.round(
        prevItem.operatingDays + (nextItem.operatingDays - prevItem.operatingDays) * progress,
      ),
      monthlyQuantity: Math.round(
        prevItem.monthlyQuantity + (nextItem.monthlyQuantity - prevItem.monthlyQuantity) * progress,
      ),
    };
  });

  res.json({
    success: true,
    code: '',
    message: 'OK',
    data: {
      available: true,
      reason: null,
      prevYearMonth: prevSnapshot.year_month,
      nextYearMonth: nextSnapshot.year_month,
      items: interpolatedItems,
    },
  });
});

export default router;
