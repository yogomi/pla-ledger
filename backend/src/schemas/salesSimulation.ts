import { z } from 'zod';

/** yearMonth フォーマット: YYYY-MM */
export const YearMonthSchema = z.string().regex(/^\d{4}-\d{2}$/, 'yearMonth must be YYYY-MM format');

/** year フォーマット: YYYY */
export const YearSchema = z.string().regex(/^\d{4}$/, 'year must be YYYY format');

/** 月次 GET エンドポイント用クエリスキーマ */
export const YearMonthQuerySchema = z.object({
  yearMonth: YearMonthSchema,
});

/** 年次 GET エンドポイント用クエリスキーマ */
export const YearQuerySchema = z.object({
  year: YearSchema,
});

/** スナップショット内のアイテムデータ */
export const ItemSnapshotSchema = z.object({
  itemId: z.string().uuid(),
  categoryId: z.string().uuid(),
  categoryName: z.string(),
  categoryOrder: z.number().int().min(0),
  itemName: z.string(),
  itemOrder: z.number().int().min(0),
  unitPrice: z.number().min(0),
  quantity: z.number().min(0),
  operatingDays: z.number().min(0),
  costRate: z.number().min(0).max(100),
  description: z.string().nullable().optional(),
});

/** 月次売上シミュレーション更新リクエストボディ */
export const SalesSimulationUpdateSchema = z.object({
  items: z.array(ItemSnapshotSchema),
});

/** 固定費アイテム */
export const FixedExpenseItemSchema = z.object({
  categoryName: z.string().min(1),
  amount: z.number().min(0),
  description: z.string().nullable().optional(),
});

/** 固定費更新リクエストボディ */
export const FixedExpensesUpdateSchema = z.object({
  expenses: z.array(FixedExpenseItemSchema),
});

/** 変動費アイテム */
export const VariableExpenseItemSchema = z.object({
  categoryName: z.string().min(1),
  amount: z.number().min(0),
  description: z.string().nullable().optional(),
});

/** 変動費更新リクエストボディ */
export const VariableExpensesUpdateSchema = z.object({
  expenses: z.array(VariableExpenseItemSchema),
});

export type ItemSnapshot = z.infer<typeof ItemSnapshotSchema>;
export type SalesSimulationUpdate = z.infer<typeof SalesSimulationUpdateSchema>;
export type FixedExpenseItem = z.infer<typeof FixedExpenseItemSchema>;
export type VariableExpenseItem = z.infer<typeof VariableExpenseItemSchema>;
