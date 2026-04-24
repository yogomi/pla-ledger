import { Router, Response } from 'express';
import { z } from 'zod';
import { Project, StartupCost } from '../../models';
import { optionalAuthenticate, AuthRequest } from '../../middleware/auth';
import { getProjectRole } from '../projects/utils';
import { formatZodError } from '../../utils/zodError';

const ParamsSchema = z.object({
  projectId: z.string().uuid(),
});

/**
 * @api {GET} /api/projects/:projectId/startup-costs スタートアップコスト取得
 * @description
 *   - 指定プロジェクトのスタートアップコスト一覧を取得
 *   - 公開プロジェクトは未認証でも閲覧可能
 *   - 非公開プロジェクトは viewer 以上の権限が必要
 *
 * @request
 *   - params: projectId (UUID)
 *   - 認証任意（公開プロジェクトは不要）
 *
 * @response
 *   - 成功時: { success: true, code: '', message: 'Startup costs retrieved',
 *               data: { items: [...] } }
 *   - エラー時: { success: false, code: 'not_found', message: 'Project not found', data: null }
 *
 * @author yogomi
 * @date 2026-04-09
 */
const router = Router({ mergeParams: true });

router.get('/', optionalAuthenticate, async (req: AuthRequest, res: Response) => {
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

  const items = await StartupCost.findAll({
    where: { project_id: projectId },
    order: [['display_order', 'ASC'], ['created_at', 'ASC']],
  });

  res.json({
    success: true,
    code: '',
    message: 'Startup costs retrieved',
    data: { items: items.map(item => item.toJSON()) },
  });
});

export default router;
