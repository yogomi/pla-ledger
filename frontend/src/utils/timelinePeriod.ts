/**
 * タイムライン期間定数と計算ユーティリティ。
 *
 * ★ この定数はフロントエンドの複数箇所とバックエンドで共有しています。
 *    値を変更する場合は以下の全箇所を必ず同時に合わせてください：
 *
 *    フロントエンド（この定数を使用）:
 *    - src/components/ProjectTimeline.tsx  （タイムライン表示）
 *    - src/components/PlanSummaryDownload.tsx （概要データダウンロード）
 *
 *    バックエンド（ハードコードされているため合わせて変更が必要）:
 *    - backend/src/api/cash-flow/getTimeline.ts の buildMonthRange(base, 12, 60) の引数
 */

/** 基準月より前に遡る月数 */
export const TIMELINE_MONTHS_BEFORE = 12;
/** 基準月より後に進む月数 */
export const TIMELINE_MONTHS_AFTER = 60;

/** 基準月 (YYYY-MM) からタイムライン期間の [from, to] を計算する */
export function buildTimelinePeriod(base: string): { from: string; to: string } {
  const [y, m] = base.split('-').map(Number);
  const fromTotal = (y - 1) * 12 + (m - 1) - TIMELINE_MONTHS_BEFORE;
  const toTotal = (y - 1) * 12 + (m - 1) + TIMELINE_MONTHS_AFTER;
  const fromYear = Math.floor(fromTotal / 12) + 1;
  const fromMonth = (fromTotal % 12) + 1;
  const toYear = Math.floor(toTotal / 12) + 1;
  const toMonth = (toTotal % 12) + 1;
  return {
    from: `${String(fromYear).padStart(4, '0')}-${String(fromMonth).padStart(2, '0')}`,
    to: `${String(toYear).padStart(4, '0')}-${String(toMonth).padStart(2, '0')}`,
  };
}

/** タイムライン期間に含まれる全年 (YYYY) の配列を返す */
export function buildTimelineYears(base: string): string[] {
  const { from, to } = buildTimelinePeriod(base);
  const fromYear = Number(from.slice(0, 4));
  const toYear = Number(to.slice(0, 4));
  return Array.from({ length: toYear - fromYear + 1 }, (_, i) => String(fromYear + i));
}
