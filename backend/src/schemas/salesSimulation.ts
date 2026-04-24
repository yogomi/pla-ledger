import { z } from 'zod';

/** 事業開始年月（キャッシュフロー計算の起点） */
const MIN_YEAR_MONTH = '2025-01';

/** yearMonth フォーマット: YYYY-MM（2025-01以降） */
export const YearMonthSchema = z.string()
  .regex(/^\d{4}-\d{2}$/, 'yearMonth must be YYYY-MM format')
  .refine(
    (val) => val >= MIN_YEAR_MONTH,
    { message: `yearMonth must be ${MIN_YEAR_MONTH} or later` },
  );

/** year フォーマット: YYYY（2025以降） */
export const YearSchema = z.string()
  .regex(/^\d{4}$/, 'year must be YYYY format')
  .refine(
    (val) => Number(val) >= 2025,
    { message: 'year must be 2025 or later' },
  );

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
  calculationType: z.enum(['daily', 'monthly']).default('daily'),
  monthlyQuantity: z.number().min(0).default(0),
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

export type ItemSnapshot = z.infer<typeof ItemSnapshotSchema>;
export type SalesSimulationUpdate = z.infer<typeof SalesSimulationUpdateSchema>;
export type FixedExpenseItem = z.infer<typeof FixedExpenseItemSchema>;
