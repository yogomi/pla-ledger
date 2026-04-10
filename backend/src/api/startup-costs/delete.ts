import { Router, Response } from 'express';
import { z } from 'zod';
import { Project, StartupCost } from '../../models';
import { authenticate, AuthRequest } from '../../middleware/auth';
import { getProjectRole } from '../projects/utils';
import { formatZodError } from '../../utils/zodError';

const ParamsSchema = z.object({
  projectId: z.string().uuid(),
});

/**
 * @api {DELETE} /api/projects/:projectId/startup-costs スタートアップコスト全削除
 * @description
 *   - 指定プロジェクトのスタートアップコストを全削除する
 *   - editor以上の権限が必要
 *
 * @request
 *   - params: projectId (UUID)
 *   - 認証必須
 *
 * @response
 *   - 成功時: { success: true, code: '', message: 'Startup costs deleted', data: null }
 *   - エラー時: { success: false, code: 'not_found', message: 'Project not found', data: null }
 *
 * @author yogomi
 * @date 2026-04-09
 */
const router = Router({ mergeParams: true });

router.delete('/', authenticate, async (req: AuthRequest, res: Response) => {
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
  const { projectId } = parsed.data;

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

  await StartupCost.destroy({ where: { project_id: projectId } });

  res.json({
    success: true,
    code: '',
    message: 'Startup costs deleted',
    data: null,
  });
});

export default router;
