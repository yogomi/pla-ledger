import api from '../utils/api';
import { FixedAsset, FixedAssetInputData, DepreciationScheduleEntry } from '../types/FixedAsset';

/**
 * 固定資産一覧を取得する。
 * @param projectId プロジェクトID
 */
export async function getFixedAssets(projectId: string): Promise<{ assets: FixedAsset[] }> {
  const res = await api.get(`/projects/${projectId}/fixed-assets`);
  return res.data.data as { assets: FixedAsset[] };
}

/**
 * 固定資産を作成する。
 * @param projectId プロジェクトID
 * @param data 入力データ
 */
export async function createFixedAsset(
  projectId: string,
  data: FixedAssetInputData,
): Promise<{ asset: FixedAsset; schedule: DepreciationScheduleEntry[] }> {
  const res = await api.post(`/projects/${projectId}/fixed-assets`, data);
  return res.data.data as { asset: FixedAsset; schedule: DepreciationScheduleEntry[] };
}

/**
 * 固定資産を更新する。
 * @param projectId プロジェクトID
 * @param assetId 固定資産ID
 * @param data 更新データ
 */
export async function updateFixedAsset(
  projectId: string,
  assetId: string,
  data: Partial<FixedAssetInputData>,
): Promise<{ asset: FixedAsset }> {
  const res = await api.put(`/projects/${projectId}/fixed-assets/${assetId}`, data);
  return res.data.data as { asset: FixedAsset };
}

/**
 * 固定資産を削除する。
 * @param projectId プロジェクトID
 * @param assetId 固定資産ID
 */
export async function deleteFixedAsset(projectId: string, assetId: string): Promise<void> {
  await api.delete(`/projects/${projectId}/fixed-assets/${assetId}`);
}

/**
 * 指定年月の月次減価償却費合計を取得する。
 * @param projectId プロジェクトID
 * @param yearMonth 対象年月 (YYYY-MM)
 */
export async function getMonthlyDepreciation(
  projectId: string,
  yearMonth: string,
): Promise<{ yearMonth: string; totalMonthlyDepreciation: number }> {
  const res = await api.get(`/projects/${projectId}/fixed-assets/depreciation/${yearMonth}`);
  return res.data.data as { yearMonth: string; totalMonthlyDepreciation: number };
}
