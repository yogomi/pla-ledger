import { Router, Response } from 'express';
import { Project, LaborCost, LaborCostMonth } from '../../models';
import { authenticate, AuthRequest } from '../../middleware/auth';
import { getProjectRole } from '../projects/utils';
import { formatZodError } from '../../utils/zodError';
import { UpdateLaborCostsSchema } from '../../schemas/labor-cost.schema';
import { YearMonthSchema } from '../../schemas/salesSimulation';
import { z } from 'zod';

/** URLパスパラメータ yearMonth のバリデーション */
const ParamsSchema = z.object({
  yearMonth: YearMonthSchema,
});

/**
 * @api {PUT} /api/projects/:projectId/labor-costs/:yearMonth 月次人件費一括更新
 * @description
 *   - 指定年月の人件費データを一括更新する
 *   - 既存データを削除して新規作成する（置換方式）
 *   - 各項目の monthlyTotal を自動計算する
 *   - LaborCostMonth レコードを作成し、以降の継承を停止する
 *   - editor 以上の権限が必要
 *
 * @request
 *   Header:
 *   - Authorization: Bearer <token> (required)
 *   Path:
 *   - projectId: string (required) - プロジェクトID
 *   - yearMonth: string (required) - 対象年月 (YYYY-MM形式)
 *   Body (JSON):
 *   - laborCosts: LaborCostInput[] (required) - 人件費アイテム配列
 *   バリデーション失敗時:
 *   { success: false, code: 'invalid_query', message: エラー内容, data: null }
 *
 * @response
 *   成功時: { success: true, code: '', message: 'Labor costs updated', data: { yearMonth, count } }
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
 *     "message": "Labor costs updated",
 *     "data": { "yearMonth": "2026-04", "count": 3 }
 *   }
 *
 * @author copilot
 * @date 2026-03-20
 */
const router = Router({ mergeParams: true });

/**
 * 月次合計を計算する
 * @param item - 人件費入力データ
 * @param socialInsuranceRate - 社会保険料率（%）
 * @returns 月次合計額
 */
function calcMonthlyTotal(
  item: z.infer<typeof UpdateLaborCostsSchema>['laborCosts'][number],
  socialInsuranceRate: number,
): number {
  if (item.type === 'owner_salary') {
    return item.ownerSalary;
  }
  if (item.type === 'full_time') {
    const bonusMonths = item.bonusMonths ?? 0;
    const monthlyBonus = item.monthlySalary * bonusMonths / 12;
    const totalSalary = (item.monthlySalary + monthlyBonus) * item.employeeCount;
    return Math.round(totalSalary * (1 + socialInsuranceRate / 100));
  }
  if (item.type === 'part_time') {
    return Math.round(
      item.hourlyWage * item.hoursPerDay * item.daysPerMonth * item.partTimeCount,
    );
  }
  return 0;
}

router.put('/:yearMonth', authenticate, async (req: AuthRequest, res: Response) => {
  const { projectId } = req.params;

  const paramsParsed = ParamsSchema.safeParse({ yearMonth: req.params['yearMonth'] });
  if (!paramsParsed.success) {
    res.status(400).json({
      success: false,
      code: 'invalid_query',
      message: formatZodError(paramsParsed.error),
      data: null,
    });
    return;
  }
  const { yearMonth } = paramsParsed.data;

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

  const parsed = UpdateLaborCostsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      code: 'invalid_query',
      message: formatZodError(parsed.error),
      data: null,
    });
    return;
  }

  const { laborCosts } = parsed.data;
  const socialInsuranceRate = Number(project.social_insurance_rate);

  // 既存データを削除して置換
  await LaborCost.destroy({ where: { project_id: projectId, year_month: yearMonth } });

  if (laborCosts.length > 0) {
    await LaborCost.bulkCreate(
      laborCosts.map((item, idx) => {
        const base = {
          project_id: projectId,
          year_month: yearMonth,
          type: item.type,
          display_order: item.displayOrder ?? idx,
          note_ja: item.noteJa ?? null,
          note_en: item.noteEn ?? null,
          monthly_salary: null as number | null,
          employee_count: null as number | null,
          bonus_months: null as number | null,
          hourly_wage: null as number | null,
          hours_per_day: null as number | null,
          days_per_month: null as number | null,
          part_time_count: null as number | null,
          owner_salary: null as number | null,
        };
        if (item.type === 'owner_salary') {
          return { ...base, owner_salary: item.ownerSalary };
        }
        if (item.type === 'full_time') {
          return {
            ...base,
            monthly_salary: item.monthlySalary,
            employee_count: item.employeeCount,
            bonus_months: item.bonusMonths ?? 0,
          };
        }
        // part_time
        return {
          ...base,
          hourly_wage: item.hourlyWage,
          hours_per_day: item.hoursPerDay,
          days_per_month: item.daysPerMonth,
          part_time_count: item.partTimeCount,
        };
      }),
    );
  }

  // 保存済み年月として記録する（空保存の場合でも継承しないようにするため）
  await LaborCostMonth.findOrCreate({
    where: { project_id: projectId, year_month: yearMonth },
    defaults: { project_id: projectId, year_month: yearMonth },
  });

  res.json({
    success: true,
    code: '',
    message: 'Labor costs updated',
    data: { yearMonth, count: laborCosts.length },
  });
});

export default router;
