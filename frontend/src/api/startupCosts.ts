import api from '../utils/api';
import { StartupCostItem } from '../components/StartupCostTable';

/** スタートアップコストの作成・更新用入力データ */
export interface StartupCostInput {
  description: string;
  quantity: number;
  unit_price: number;
  cost_type: StartupCostItem['cost_type'];
  allocation_month: string;
  display_order?: number;
}

function normalizeStartupCostItem(item: StartupCostItem): StartupCostItem {
  return {
    ...item,
    // Sequelize の DECIMAL カラムは文字列で返るため、number に変換する
    quantity: Number(item.quantity),
    unit_price: Number(item.unit_price),
  };
}

/**
 * スタートアップコスト一覧を取得する。
 * @param projectId プロジェクトID
 */
export async function getStartupCosts(projectId: string): Promise<StartupCostItem[]> {
  const res = await api.get(`/projects/${projectId}/startup-costs`);
  return (res.data.data.items as StartupCostItem[]).map(normalizeStartupCostItem);
}

/**
 * スタートアップコストを一括更新する（全削除→再作成）。
 * @param projectId プロジェクトID
 * @param items 更新するアイテム一覧
 */
export async function updateStartupCosts(
  projectId: string,
  items: StartupCostInput[],
): Promise<StartupCostItem[]> {
  const res = await api.put(`/projects/${projectId}/startup-costs`, { items });
  return (res.data.data.items as StartupCostItem[]).map(normalizeStartupCostItem);
}

/**
 * スタートアップコストを全削除する。
 * @param projectId プロジェクトID
 */
export async function deleteStartupCosts(projectId: string): Promise<void> {
  await api.delete(`/projects/${projectId}/startup-costs`);
}
