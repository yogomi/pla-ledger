import api from '../utils/api';
import {
  SalesSimulationData,
  ExpenseSimulationData,
  ProfitLossYearlyData,
  FiscalYearSummaryData,
  SalesYearlyData,
  SalesYearlyItemsData,
  ExpenseYearlyData,
  ItemInputData,
  ExpenseInputItem,
  LaborCostMonthlyData,
  LaborCostInput,
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
 * 指定月の人件費データを取得する。
 * @param projectId プロジェクトID
 * @param yearMonth 年月 (YYYY-MM)
 */
export async function getLaborCostMonthly(
  projectId: string,
  yearMonth: string,
): Promise<LaborCostMonthlyData> {
  const res = await api.get(
    `/projects/${projectId}/labor-costs/monthly`,
    { params: { yearMonth } },
  );
  return res.data.data as LaborCostMonthlyData;
}

/**
 * 指定月の人件費データを一括更新する。
 * @param projectId プロジェクトID
 * @param yearMonth 年月 (YYYY-MM)
 * @param laborCosts 人件費アイテム一覧
 */
export async function updateLaborCosts(
  projectId: string,
  yearMonth: string,
  laborCosts: LaborCostInput[],
): Promise<void> {
  await api.put(`/projects/${projectId}/labor-costs/${yearMonth}`, { laborCosts });
}

/**
 * プロジェクトの事業年度別法人税計算サマリーを取得する。
 * @param projectId プロジェクトID
 */
export async function getFiscalYearSummary(
  projectId: string,
): Promise<FiscalYearSummaryData> {
  const res = await api.get(`/projects/${projectId}/profit-loss/fiscal-summary`);
  return res.data.data as FiscalYearSummaryData;
}

/**
 * 指定月の売上シミュレーションスナップショットを削除する。
 * @param projectId プロジェクトID
 * @param yearMonth 年月 (YYYY-MM)
 */
export async function deleteSalesSimulationMonthly(
  projectId: string,
  yearMonth: string,
): Promise<void> {
  await api.delete(`/projects/${projectId}/sales-simulations/${yearMonth}`);
}

/**
 * 指定月の固定費を削除する。
 * @param projectId プロジェクトID
 * @param yearMonth 年月 (YYYY-MM)
 */
export async function deleteFixedExpenses(
  projectId: string,
  yearMonth: string,
): Promise<void> {
  await api.delete(`/projects/${projectId}/fixed-expenses/${yearMonth}`);
}

/**
 * 指定月の人件費を削除する。
 * @param projectId プロジェクトID
 * @param yearMonth 年月 (YYYY-MM)
 */
export async function deleteLaborCosts(
  projectId: string,
  yearMonth: string,
): Promise<void> {
  await api.delete(`/projects/${projectId}/labor-costs/${yearMonth}`);
}

/**
 * 指定年の売上シミュレーションデータをカテゴリ別に取得する。
 * @param projectId プロジェクトID
 * @param year 年 (YYYY)
 */
export async function getSalesSimulationYearly(
  projectId: string,
  year: string,
): Promise<SalesYearlyData> {
  const res = await api.get(
    `/projects/${projectId}/sales-simulations/yearly`,
    { params: { year } },
  );
  return res.data.data as SalesYearlyData;
}

/**
 * 指定年の売上シミュレーションデータを品目レベルで取得する。
 * @param projectId プロジェクトID
 * @param year 年 (YYYY)
 */
export async function getSalesSimulationYearlyItems(
  projectId: string,
  year: string,
): Promise<SalesYearlyItemsData> {
  const res = await api.get(
    `/projects/${projectId}/sales-simulations/yearly-items`,
    { params: { year } },
  );
  return res.data.data as SalesYearlyItemsData;
}

/**
 * 指定年の経費シミュレーションデータをカテゴリ別に取得する。
 * @param projectId プロジェクトID
 * @param year 年 (YYYY)
 */
export async function getExpenseSimulationYearly(
  projectId: string,
  year: string,
): Promise<ExpenseYearlyData> {
  const res = await api.get(
    `/projects/${projectId}/expense-simulations/yearly`,
    { params: { year } },
  );
  return res.data.data as ExpenseYearlyData;
}
