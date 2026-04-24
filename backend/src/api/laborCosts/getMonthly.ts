import { Router, Response } from 'express';
import { Op } from 'sequelize';
import { Project, LaborCost, LaborCostMonth } from '../../models';
import { optionalAuthenticate, AuthRequest } from '../../middleware/auth';
import { getProjectRole } from '../projects/utils';
import { formatZodError } from '../../utils/zodError';
import { YearMonthQuerySchema } from '../../schemas/salesSimulation';
import { calcLaborMonthlyTotal } from '../../utils/laborCostCalculator';

/**
 * @api {GET} /api/projects/:projectId/labor-costs/monthly 月次人件費取得
 * @description
 *   - 指定年月の人件費データを取得する
 *   - 当月データが存在しない場合、LaborCostMonth レコードの有無を確認する
 *   - LaborCostMonth レコードが存在しない（一度も保存されていない）場合のみ、
 *     直近の過去月データを継承する（isInherited: true）
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
 *   成功時: { success: true, code: '', message: 'OK', data: { yearMonth, isInherited,
 *             socialInsuranceRate, laborCosts, monthlyTotal } }
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
 *       "yearMonth": "2026-04",
 *       "isInherited": false,
 *       "socialInsuranceRate": 15.0,
 *       "laborCosts": [
 *         { "id": "uuid", "type": "owner_salary", "ownerSalary": 300000,
 *           "monthlyTotal": 300000, "displayOrder": 0 }
 *       ],
 *       "monthlyTotal": 300000
 *     }
 *   }
 *
 * @author copilot
 * @date 2026-03-20
 */
const router = Router({ mergeParams: true });

router.get('/monthly', optionalAuthenticate, async (req: AuthRequest, res: Response) => {
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
  const socialInsuranceRate = Number(project.social_insurance_rate);

  // 人件費取得
  let laborCosts = await LaborCost.findAll({
    where: { project_id: projectId, year_month: yearMonth },
    order: [['display_order', 'ASC']],
  });

  // 継承ロジック:
  // LaborCostMonth レコードが存在しない（未保存）場合のみ直近の過去月を継承する
  let isInherited = false;
  if (laborCosts.length === 0) {
    const savedRecord = await LaborCostMonth.findOne({
      where: { project_id: projectId, year_month: yearMonth },
    });
    if (!savedRecord) {
      const recentRecord = await LaborCost.findOne({
        where: { project_id: projectId, year_month: { [Op.lt]: yearMonth } },
        order: [['year_month', 'DESC']],
      });
      if (recentRecord) {
        laborCosts = await LaborCost.findAll({
          where: { project_id: projectId, year_month: recentRecord.year_month },
          order: [['display_order', 'ASC']],
        });
        isInherited = true;
      }
    }
  }

  const monthlyTotal = laborCosts.reduce(
    (sum, lc) => sum + calcLaborMonthlyTotal(lc, socialInsuranceRate),
    0,
  );

  res.json({
    success: true,
    code: '',
    message: 'OK',
    data: {
      yearMonth,
      isInherited,
      socialInsuranceRate,
      laborCosts: laborCosts.map(lc => ({
        id: lc.id,
        type: lc.type,
        monthlySalary: lc.monthly_salary !== null ? Number(lc.monthly_salary) : null,
        employeeCount: lc.employee_count,
        bonusMonths: lc.bonus_months !== null ? Number(lc.bonus_months) : null,
        hourlyWage: lc.hourly_wage !== null ? Number(lc.hourly_wage) : null,
        hoursPerDay: lc.hours_per_day !== null ? Number(lc.hours_per_day) : null,
        daysPerMonth: lc.days_per_month,
        partTimeCount: lc.part_time_count !== null ? Number(lc.part_time_count) : null,
        ownerSalary: lc.owner_salary !== null ? Number(lc.owner_salary) : null,
        monthlyTotal: calcLaborMonthlyTotal(lc, socialInsuranceRate),
        displayOrder: lc.display_order,
        noteJa: lc.note_ja,
        noteEn: lc.note_en,
      })),
      monthlyTotal,
    },
  });
});

export default router;
