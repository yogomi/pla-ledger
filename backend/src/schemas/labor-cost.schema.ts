import { z } from 'zod';

/** 個別人件費アイテムの入力スキーマ（種別ごとに必須フィールドをチェック） */
export const LaborCostInputSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('owner_salary'),
    ownerSalary: z.number().nonnegative(),
    displayOrder: z.number().int().nonnegative().optional().default(0),
    noteJa: z.string().optional().nullable(),
    noteEn: z.string().optional().nullable(),
  }),
  z.object({
    type: z.literal('full_time'),
    monthlySalary: z.number().nonnegative(),
    employeeCount: z.number().int().nonnegative(),
    bonusMonths: z.number().nonnegative().optional().default(0),
    displayOrder: z.number().int().nonnegative().optional().default(0),
    noteJa: z.string().optional().nullable(),
    noteEn: z.string().optional().nullable(),
  }),
  z.object({
    type: z.literal('part_time'),
    hourlyWage: z.number().nonnegative(),
    hoursPerDay: z.number().nonnegative(),
    daysPerMonth: z.number().int().nonnegative(),
    partTimeCount: z.number().nonnegative(),
    displayOrder: z.number().int().nonnegative().optional().default(0),
    noteJa: z.string().optional().nullable(),
    noteEn: z.string().optional().nullable(),
  }),
]);

/** 月次人件費一括更新リクエストボディ */
export const UpdateLaborCostsSchema = z.object({
  laborCosts: z.array(LaborCostInputSchema),
});

export type LaborCostInput = z.infer<typeof LaborCostInputSchema>;
export type UpdateLaborCosts = z.infer<typeof UpdateLaborCostsSchema>;
