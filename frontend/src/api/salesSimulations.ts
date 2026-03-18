import api from '../utils/api';
import {
  SalesSimulationData,
  ExpenseSimulationData,
  ProfitLossYearlyData,
  ItemInputData,
  ExpenseInputItem,
} from '../types/SalesSimulation';

/**
 * 指定月の売上シミュレーションデータを取得する。
 * @param projectId プロジェクトID
 * @param yearMonth 年月 (YYYY-MM)
 */
export async function getSalesSimulationMonthly(
  projectId: string,
  yearMonth: string,
): Promise<SalesSimulationData> {
  const res = await api.get(
    `/projects/${projectId}/sales-simulations/monthly-expanded`,
    { params: { yearMonth } },
  );
  return res.data.data as SalesSimulationData;
}

/**
 * 指定月の売上シミュレーションデータを保存する。
 * @param projectId プロジェクトID
 * @param yearMonth 年月 (YYYY-MM)
 * @param items 品目一覧
 */
export async function updateSalesSimulationMonthly(
  projectId: string,
  yearMonth: string,
  items: ItemInputData[],
): Promise<void> {
  await api.put(`/projects/${projectId}/sales-simulations/${yearMonth}`, { items });
}

/**
 * 指定月の経費シミュレーションデータを取得する。
 * @param projectId プロジェクトID
 * @param yearMonth 年月 (YYYY-MM)
 */
export async function getExpenseSimulationMonthly(
  projectId: string,
  yearMonth: string,
): Promise<ExpenseSimulationData> {
  const res = await api.get(
    `/projects/${projectId}/expense-simulations/monthly`,
    { params: { yearMonth } },
  );
  return res.data.data as ExpenseSimulationData;
}

/**
 * 指定年の損益計算書データを取得する。
 * @param projectId プロジェクトID
 * @param year 年 (YYYY)
 */
export async function getProfitLossYearly(
  projectId: string,
  year: string,
): Promise<ProfitLossYearlyData> {
  const res = await api.get(
    `/projects/${projectId}/profit-loss/yearly`,
    { params: { year } },
  );
  return res.data.data as ProfitLossYearlyData;
}

/**
 * 指定月の固定費を保存する。
 * @param projectId プロジェクトID
 * @param yearMonth 年月 (YYYY-MM)
 * @param expenses 経費項目一覧
 */
export async function updateFixedExpenses(
  projectId: string,
  yearMonth: string,
  expenses: ExpenseInputItem[],
): Promise<void> {
  await api.put(`/projects/${projectId}/fixed-expenses/${yearMonth}`, { expenses });
}

/**
 * 指定月の変動費を保存する。
 * @param projectId プロジェクトID
 * @param yearMonth 年月 (YYYY-MM)
 * @param expenses 経費項目一覧
 */
export async function updateVariableExpenses(
  projectId: string,
  yearMonth: string,
  expenses: ExpenseInputItem[],
): Promise<void> {
  await api.put(`/projects/${projectId}/variable-expenses/${yearMonth}`, { expenses });
}

/**
 * 売上シミュレーションカテゴリを作成する。
 * @param projectId プロジェクトID
 * @param categoryName カテゴリ名
 * @param categoryOrder 表示順序
 */
export async function createSalesCategory(
  projectId: string,
  categoryName: string,
  categoryOrder?: number,
): Promise<{ id: string; project_id: string; category_name: string; category_order: number }> {
  const res = await api.post(
    `/projects/${projectId}/sales-simulations/categories`,
    { categoryName, categoryOrder },
  );
  return res.data.data.category;
}

/**
 * 売上シミュレーションカテゴリを削除する。
 * @param projectId プロジェクトID
 * @param categoryId カテゴリID
 */
export async function deleteSalesCategory(
  projectId: string,
  categoryId: string,
): Promise<void> {
  await api.delete(`/projects/${projectId}/sales-simulations/categories/${categoryId}`);
}

/**
 * 売上シミュレーションアイテムを作成する。
 * @param projectId プロジェクトID
 * @param categoryId カテゴリID
 * @param itemName アイテム名
 */
export async function createSalesItem(
  projectId: string,
  categoryId: string,
  itemName: string,
): Promise<{ id: string; category_id: string; project_id: string; item_name: string }> {
  const res = await api.post(
    `/projects/${projectId}/sales-simulations/items`,
    { categoryId, itemName },
  );
  return res.data.data.item;
}

/**
 * 売上シミュレーションアイテムを削除する。
 * @param projectId プロジェクトID
 * @param itemId アイテムID
 */
export async function deleteSalesItem(
  projectId: string,
  itemId: string,
): Promise<void> {
  await api.delete(`/projects/${projectId}/sales-simulations/items/${itemId}`);
}
