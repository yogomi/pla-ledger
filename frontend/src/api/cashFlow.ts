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

/** タイムラインエントリ */
export interface TimelineEntry {
  yearMonth: string;
  noteJa: string | null;
  noteEn: string | null;
}

/**
 * タイムラインデータを一括取得する。
 * 基準月の前12ヶ月・後60ヶ月の範囲でコメントが存在する月のみを返す。
 * 期間定数は frontend/src/utils/timelinePeriod.ts で管理している。
 * @param projectId プロジェクトID
 * @param base 基準年月 (YYYY-MM)
 */
export async function getCashFlowTimeline(
  projectId: string,
  base: string,
): Promise<TimelineEntry[]> {
  const res = await api.get(`/projects/${projectId}/cash-flow/timeline`, { params: { base } });
  return (res.data.data as { entries: TimelineEntry[] }).entries;
}
