import { z } from 'zod';

/** 借入作成リクエストボディのスキーマ */
export const createLoanSchema = z.object({
  lenderName: z.string().min(1).max(255),
  principalAmount: z.number().positive(),
  interestRate: z.number().min(0).max(100),
  loanDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'loanDate must be YYYY-MM-DD'),
  repaymentMonths: z.number().int().positive(),
  repaymentMethod: z.enum(['equal_payment', 'equal_principal', 'bullet']),
  description: z.string().nullable().optional(),
});

/** 借入更新リクエストボディのスキーマ（部分更新） */
export const updateLoanSchema = createLoanSchema.partial();

export type CreateLoanInput = z.infer<typeof createLoanSchema>;
export type UpdateLoanInput = z.infer<typeof updateLoanSchema>;
