import { LaborCost } from '../models';

/**
 * LaborCost モデルインスタンスから月次合計を計算する。
 * social_insurance_rate の変更時にも正確な値を返すため、DBに保存せず都度計算する。
 * @param lc - LaborCost モデルインスタンス
 * @param socialInsuranceRate - 社会保険料率（%）
 * @returns 月次合計額（円）
 */
export function calcLaborMonthlyTotal(lc: LaborCost, socialInsuranceRate: number): number {
  if (lc.type === 'owner_salary') {
    return Number(lc.owner_salary ?? 0);
  }
  if (lc.type === 'full_time') {
    const bonusMonths = Number(lc.bonus_months ?? 0);
    const monthlySalary = Number(lc.monthly_salary ?? 0);
    const employeeCount = Number(lc.employee_count ?? 0);
    const monthlyBonus = monthlySalary * bonusMonths / 12;
    const totalSalary = (monthlySalary + monthlyBonus) * employeeCount;
    return Math.round(totalSalary * (1 + socialInsuranceRate / 100));
  }
  if (lc.type === 'part_time') {
    return Math.round(
      Number(lc.hourly_wage ?? 0) * Number(lc.hours_per_day ?? 0)
      * Number(lc.days_per_month ?? 0) * Number(lc.part_time_count ?? 0),
    );
  }
  return 0;
}
