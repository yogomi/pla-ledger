/** 固定資産カテゴリー */
export type AssetCategory = 'building' | 'equipment' | 'vehicle' | 'intangible' | 'other';

/** 減価償却方法 */
export type DepreciationMethod = 'straight_line' | 'diminishing';

/** 固定資産データ */
export interface FixedAsset {
  id: string;
  projectId: string;
  assetName: string;
  assetCategory: AssetCategory;
  purchaseDate: string;
  purchaseAmount: number;
  usefulLife: number;
  salvageValue: number;
  depreciationMethod: DepreciationMethod;
  startDepreciationDate: string;
  endDepreciationDate: string;
  monthlyDepreciation: number;
  notes: string | null;
  createdAt?: string;
  updatedAt?: string;
}

/** 月次償却スケジュールの1エントリ */
export interface DepreciationScheduleEntry {
  yearMonth: string;
  monthlyDepreciation: number;
  accumulatedDepreciation: number;
  bookValue: number;
}

/** 固定資産登録・更新用の入力データ */
export interface FixedAssetInputData {
  assetName: string;
  assetCategory: AssetCategory;
  purchaseDate: string;
  purchaseAmount: number;
  usefulLife: number;
  salvageValue: number;
  depreciationMethod: DepreciationMethod;
  startDepreciationDate: string;
  notes?: string;
}
