import { Router, Response } from 'express';
import { Op } from 'sequelize';
import { z } from 'zod';
import { Project, CashFlowMonthly } from '../../models';
import { optionalAuthenticate, AuthRequest } from '../../middleware/auth';
import { getProjectRole } from '../projects/utils';
import { formatZodError } from '../../utils/zodError';
import { YearMonthSchema } from '../../schemas/salesSimulation';

/**
 * @api {GET} /api/projects/:projectId/cash-flow/timeline タイムライン一括取得
 * @description
 *   - 指定基準月（base）の前12ヶ月・後60ヶ月の範囲内で、コメント（note_ja または note_en）が
 *     存在する月のデータを一括取得して返す。
 *   - 複数月の並列リクエストを回避するための一括取得エンドポイント。
 *   - viewer 以上の権限が必要。
 *
 * @request
 *   Header:
 *   - Authorization: Bearer {token} (required)
 *   Path:
 *   - projectId: string (required) - プロジェクトID (UUID)
 *   Query:
 *   - base: string (required) - 基準年月 (YYYY-MM)
 *
 * @response
 *   成功時: {
 *     success: true, code: '', message: 'Timeline retrieved successfully',
 *     data: {
 *       entries: [{ yearMonth: string, noteJa: string | null, noteEn: string | null }]
 *     }
 *   }
 *   失敗時:
 *     - 400: { success: false, code: 'invalid_query', message: 'エラー内容', data: null }
 *     - 403: { success: false, code: 'forbidden', message: 'View permission required', data: null }
 *     - 404: { success: false, code: 'not_found', message: 'Project not found', data: null }
 *
 * @responseExample 成功例
 *   {
 *     "success": true,
 *     "code": "",
 *     "message": "Timeline retrieved successfully",
 *     "data": {
 *       "entries": [
 *         { "yearMonth": "2026-11", "noteJa": "事業開始", "noteEn": "Business launch" }
 *       ]
 *     }
 *   }
 *
 * @author copilot
 * @date 2026-04-11
 */
const router = Router({ mergeParams: true });

const QuerySchema = z.object({
  projectId: z.string().uuid(),
  base: YearMonthSchema,
});

/** YYYY-MM 形式の年月から前 before ヶ月・後 after ヶ月の範囲 [from, to] を生成する */
function buildMonthRange(base: string, before: number, after: number): { from: string; to: string } {
  const [y, m] = base.split('-').map(Number);
  const fromTotal = (y - 1) * 12 + (m - 1) - before;
  const toTotal = (y - 1) * 12 + (m - 1) + after;

  const fromYear = Math.floor(fromTotal / 12) + 1;
  const fromMonth = (fromTotal % 12) + 1;
  const toYear = Math.floor(toTotal / 12) + 1;
  const toMonth = (toTotal % 12) + 1;

  return {
    from: `${String(fromYear).padStart(4, '0')}-${String(fromMonth).padStart(2, '0')}`,
    to: `${String(toYear).padStart(4, '0')}-${String(toMonth).padStart(2, '0')}`,
  };
}

router.get('/timeline', optionalAuthenticate, async (req: AuthRequest, res: Response) => {
  const parsed = QuerySchema.safeParse({ projectId: req.params.projectId, base: req.query.base });
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      code: 'invalid_query',
      message: formatZodError(parsed.error),
      data: null,
    });
    return;
  }

  const { projectId, base } = parsed.data;

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

  // ★ この期間定数 (before=12, after=60) はフロントエンドと連動しています。
  //    変更する場合は frontend/src/utils/timelinePeriod.ts の
  //    TIMELINE_MONTHS_BEFORE / TIMELINE_MONTHS_AFTER も必ず同時に変更してください。
  const { from, to } = buildMonthRange(base, 12, 60);

  const records = await CashFlowMonthly.findAll({
    where: {
      project_id: projectId,
      year_month: { [Op.between]: [from, to] },
      [Op.or]: [
        { note_ja: { [Op.ne]: null } },
        { note_en: { [Op.ne]: null } },
      ],
    },
    attributes: ['year_month', 'note_ja', 'note_en'],
    order: [['year_month', 'ASC']],
  });

  const entries = records.map(r => ({
    yearMonth: r.year_month,
    noteJa: r.note_ja,
    noteEn: r.note_en,
  }));

  res.json({
    success: true,
    code: '',
    message: 'Timeline retrieved successfully',
    data: { entries },
  });
});

export default router;
