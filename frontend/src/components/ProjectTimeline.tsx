import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Alert,
  Box,
  CircularProgress,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { getCashFlowTimeline } from '../api/cashFlow';

interface ProjectTimelineProps {
  /** プロジェクトID */
  projectId: string;
  /**
   * 開業予定日 (YYYY-MM)。
   * 未設定の場合はバックエンドと同じデフォルト値 '2025-01' を使用する。
   */
  plannedOpeningDate: string | null;
  /**
   * クエリを実行するか否か。
   * CF APIは認証が必要なため、ユーザーがロールを持つ場合のみ true にする。
   */
  enabled?: boolean;
}

/**
 * キャッシュフローのコメントを時系列で表示するコンポーネント。
 * タイムライン一括取得APIを使い、開業予定日前後24ヶ月のコメント付き月を表示する。
 * 49件の並列リクエストを1件に削減することでレートリミット超過を防ぐ。
 */
export default function ProjectTimeline({
  projectId,
  plannedOpeningDate,
  enabled = true,
}: ProjectTimelineProps) {
  const { t, i18n } = useTranslation();
  const base = plannedOpeningDate ?? '2025-01';

  const { data, isLoading, isError } = useQuery({
    queryKey: ['cashFlowTimeline', projectId, base],
    queryFn: () => getCashFlowTimeline(projectId, base),
    enabled: Boolean(projectId) && enabled,
  });

  /** ロケールに応じてコメントを取得する */
  const getNote = (noteJa: string | null, noteEn: string | null): string | null => {
    const lang = i18n.language;
    if (lang === 'ja' && noteJa) return noteJa;
    if (lang !== 'ja' && noteEn) return noteEn;
    // フォールバック: 存在する方を返す
    return noteJa ?? noteEn ?? null;
  };

  /** YYYY-MM を表示用文字列にフォーマット */
  const formatMonth = (yearMonth: string): string => {
    const [y, m] = yearMonth.split('-').map(Number);
    const date = new Date(y, m - 1, 1);
    return date.toLocaleDateString(i18n.language, { year: 'numeric', month: 'long' });
  };

  if (!enabled) {
    return (
      <Typography variant="body2" color="text.secondary">
        {t('sign_in_to_view_timeline')}
      </Typography>
    );
  }

  if (isLoading) {
    return (
      <Box display="flex" alignItems="center" gap={1} py={2}>
        <CircularProgress size={20} />
        <Typography variant="body2" color="text.secondary">{t('loading')}</Typography>
      </Box>
    );
  }

  if (isError) {
    return <Alert severity="error">{t('failed_to_load')}</Alert>;
  }

  const entries = (data ?? [])
    .map(e => ({ yearMonth: e.yearMonth, note: getNote(e.noteJa, e.noteEn) }))
    .filter(e => e.note !== null && e.note.trim() !== '');

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
