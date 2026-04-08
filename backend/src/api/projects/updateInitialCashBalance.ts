import { Router, Response } from 'express';
import { z } from 'zod';
import { Project } from '../../models';
import { authenticate, AuthRequest } from '../../middleware/auth';
import { getProjectRole } from './utils';
import { formatZodError } from '../../utils/zodError';

const ParamsSchema = z.object({
  projectId: z.string().uuid(),
});

const BodySchema = z.object({
  initialCashBalance: z.number(),
});

/**
 * @api {PATCH} /api/projects/:projectId/initial-cash-balance 初期現金残高更新
 * @description
 *   - プロジェクトの事業開始時（2025年1月）の初期現金残高を更新する
 *   - owner 権限が必要
 *   - この値を変更すると、全月のキャッシュフロー残高が再計算される
 *
 * @request
 *   - params: projectId (UUID)
 *   - body: { initialCashBalance: number }
 *   - バリデーション：Zodで number 型チェック
 *   - 認証必須、owner権限が必要
 *
 * @response
 *   - 成功時: { success: true, code: '', message: 'Initial cash balance updated successfully',
 *               data: { initialCashBalance } }
 *   - バリデーションエラー: { success: false, code: 'invalid_query', message: 'エラー内容', data: null }
 *   - 認可エラー: { success: false, code: 'forbidden', message: 'Only owner can update initial cash balance',
 *                   data: null }
 *
 * @responseExample 成功例
 *   {
 *     "success": true,
 *     "code": "",
 *     "message": "Initial cash balance updated successfully",
 *     "data": { "initialCashBalance": 1000000 }
 *   }
 *
 * @responseExample 失敗例
 *   {
 *     "success": false,
 *     "code": "forbidden",
 *     "message": "Only owner can update initial cash balance",
 *     "data": null
 *   }
 *
 * @author yogomi
 * @date 2026-04-08
 */
const router = Router();

router.patch('/:projectId/initial-cash-balance', authenticate, async (req: AuthRequest, res: Response) => {
  const parsedParams = ParamsSchema.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json({
      success: false,
      code: 'invalid_query',
      message: formatZodError(parsedParams.error),
      data: null,
    });
    return;
  }
  const { projectId } = parsedParams.data;

  const parsedBody = BodySchema.safeParse(req.body);
  if (!parsedBody.success) {
    res.status(400).json({
      success: false,
      code: 'invalid_query',
      message: formatZodError(parsedBody.error),
      data: null,
    });
    return;
  }
  const { initialCashBalance } = parsedBody.data;

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

  // owner 権限のみ更新可能
  const role = await getProjectRole(projectId, req.user!.id);
  if (role !== 'owner') {
    res.status(403).json({
      success: false,
      code: 'forbidden',
      message: 'Only owner can update initial cash balance',
      data: null,
    });
    return;
  }

  await project.update({ initial_cash_balance: initialCashBalance });

  res.json({
    success: true,
    code: '',
    message: 'Initial cash balance updated successfully',
    data: {
      initialCashBalance: Number(project.initial_cash_balance),
    },
  });
});

export default router;
