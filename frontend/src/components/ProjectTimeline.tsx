import React from 'react';
import { useQueries } from '@tanstack/react-query';
import {
  Alert,
  Box,
  CircularProgress,
  Paper,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { getCashFlowMonthly } from '../api/cashFlow';

/** 指定年月から前後 N ヶ月分の YYYY-MM リストを生成する */
function generateMonthRange(baseYearMonth: string, before: number, after: number): string[] {
  const [y, m] = baseYearMonth.split('-').map(Number);
  const months: string[] = [];
  for (let delta = -before; delta <= after; delta++) {
    const total = (y - 1) * 12 + (m - 1) + delta;
    const year = Math.floor(total / 12) + 1;
    const month = (total % 12) + 1;
    months.push(`${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}`);
  }
  return months;
}

interface ProjectTimelineProps {
  /** プロジェクトID */
  projectId: string;
  /**
   * 開業予定日 (YYYY-MM)。
   * 未設定の場合はバックエンドと同じデフォルト値 '2025-01' を使用する。
   */
  plannedOpeningDate: string | null;
}

/**
 * キャッシュフローのコメントを時系列で表示するコンポーネント。
 * 開業予定日を基準に前後24ヶ月分のデータを並列取得し、
 * コメントが存在する月のみを時系列順に表示する。
 */
export default function ProjectTimeline({ projectId, plannedOpeningDate }: ProjectTimelineProps) {
  const { t, i18n } = useTranslation();
  const base = plannedOpeningDate ?? '2025-01';
  const months = generateMonthRange(base, 24, 24);

  const results = useQueries({
    queries: months.map(yearMonth => ({
      queryKey: ['cashFlow', projectId, yearMonth],
      queryFn: () => getCashFlowMonthly(projectId, yearMonth),
      enabled: Boolean(projectId),
    })),
  });

  const isLoading = results.some(r => r.isLoading);
  const hasError = results.some(r => r.isError);

  /** ロケールに応じてコメントを取得する */
  const getNote = (notes: { ja: string | null; en: string | null }): string | null => {
    const lang = i18n.language;
    if (lang === 'ja' && notes.ja) return notes.ja;
    if (lang !== 'ja' && notes.en) return notes.en;
    // フォールバック: 存在する方を返す
    return notes.ja ?? notes.en ?? null;
  };

  /** コメントが存在するエントリのみを抽出 */
  const entries = results
    .map((r, idx) => ({ yearMonth: months[idx], data: r.data }))
    .filter(e => e.data !== undefined)
    .map(e => ({
      yearMonth: e.yearMonth,
      note: getNote(e.data!.notes),
    }))
    .filter(e => e.note !== null && e.note.trim() !== '');

  /** YYYY-MM を表示用文字列にフォーマット */
  const formatMonth = (yearMonth: string): string => {
    const [y, m] = yearMonth.split('-').map(Number);
    const date = new Date(y, m - 1, 1);
    return date.toLocaleDateString(i18n.language, { year: 'numeric', month: 'long' });
  };

  if (isLoading) {
    return (
      <Box display="flex" alignItems="center" gap={1} py={2}>
        <CircularProgress size={20} />
        <Typography variant="body2" color="text.secondary">{t('loading')}</Typography>
      </Box>
    );
  }

  if (hasError) {
    return <Alert severity="error">{t('failed_to_load')}</Alert>;
  }

  if (entries.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        {t('no_cashflow_notes')}
      </Typography>
    );
  }

  return (
    <Box>
      {entries.map(e => (
        <Box key={e.yearMonth} mb={2}>
          <Typography variant="subtitle1" fontWeight="bold" color="primary">
            {formatMonth(e.yearMonth)}
          </Typography>
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mt: 0.5 }}>
            {e.note}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}
