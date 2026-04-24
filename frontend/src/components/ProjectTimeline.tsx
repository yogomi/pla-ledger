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
 * タイムライン一括取得APIを使い、開業予定日の前12ヶ月・後60ヶ月のコメント付き月を表示する。
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

  /** 日英両方のコメントを返す。どちらか一方のみでも返す。 */
  const hasNote = (noteJa: string | null, noteEn: string | null): boolean =>
    Boolean(noteJa?.trim()) || Boolean(noteEn?.trim());

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

  const entries = (data ?? []).filter(e => hasNote(e.noteJa, e.noteEn));

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
          {e.noteJa && (
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mt: 0.5 }}>
              {e.noteJa}
            </Typography>
          )}
          {e.noteEn && (
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mt: e.noteJa ? 0.5 : 0.5, color: 'text.secondary' }}>
              {e.noteEn}
            </Typography>
          )}
        </Box>
      ))}
    </Box>
  );
}
