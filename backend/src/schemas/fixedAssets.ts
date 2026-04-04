import { z } from 'zod';

/** 固定資産カテゴリー */
export const AssetCategoryEnum = z.enum([
  'building',
  'equipment',
  'vehicle',
  'intangible',
  'other',
]);

/** 減価償却方法 */
export const DepreciationMethodEnum = z.enum(['straight_line', 'diminishing']);

/** 日付文字列スキーマ（YYYY-MM-DD 形式） */
const DateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
  message: 'Date must be in YYYY-MM-DD format',
});

/** 固定資産の基本フィールドスキーマ（refine なし） */
const FixedAssetBaseSchema = z.object({
  assetName: z.string().min(1, { message: 'Asset name is required' }),
  assetCategory: AssetCategoryEnum,
  purchaseDate: DateStringSchema,
  purchaseAmount: z.number().positive({ message: 'Purchase amount must be positive' }),
  usefulLife: z
    .number()
    .int()
    .min(1, { message: 'Useful life must be at least 1 year' })
    .max(100, { message: 'Useful life cannot exceed 100 years' }),
  salvageValue: z.number().min(0, { message: 'Salvage value cannot be negative' }).optional().default(0),
  depreciationMethod: DepreciationMethodEnum,
  startDepreciationDate: DateStringSchema,
  notes: z.string().optional(),
});

/**
 * 固定資産登録スキーマ。
 * 購入日・金額・耐用年数の妥当性チェックを含む。
 */
export const CreateFixedAssetSchema = FixedAssetBaseSchema.refine(
  (data) => Number(data.salvageValue ?? 0) < data.purchaseAmount,
  { message: 'Salvage value must be less than purchase amount', path: ['salvageValue'] },
);

/** 固定資産更新スキーマ（全フィールドオプション） */
export const UpdateFixedAssetSchema = FixedAssetBaseSchema.partial();
