import api from '../utils/api';
import { CashFlowMonthlyData, CashFlowYearlyData, CashFlowInputData } from '../types/CashFlow';

/**
 * 月次キャッシュフローデータを取得する。
 * @param projectId プロジェクトID
 * @param yearMonth 対象年月 (YYYY-MM)
 */
export async function getCashFlowMonthly(
  projectId: string,
  yearMonth: string,
): Promise<CashFlowMonthlyData> {
  const res = await api.get(`/projects/${projectId}/cash-flow/monthly/${yearMonth}`);
  return res.data.data as CashFlowMonthlyData;
}

/**
 * 月次キャッシュフローデータを更新する。
 * @param projectId プロジェクトID
 * @param yearMonth 対象年月 (YYYY-MM)
 * @param data 更新データ
 */
export async function updateCashFlowMonthly(
  projectId: string,
  yearMonth: string,
  data: CashFlowInputData,
): Promise<CashFlowMonthlyData> {
  const res = await api.put(`/projects/${projectId}/cash-flow/monthly/${yearMonth}`, data);
  return res.data.data as CashFlowMonthlyData;
}

/**
 * 年次キャッシュフローデータを取得する。
 * @param projectId プロジェクトID
 * @param year 対象年 (YYYY)
 */
export async function getCashFlowYearly(
  projectId: string,
  year: string,
): Promise<CashFlowYearlyData> {
  const res = await api.get(`/projects/${projectId}/cash-flow/yearly/${year}`);
  return res.data.data as CashFlowYearlyData;
}
