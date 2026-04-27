import {
  Alert,
  Box,
  CircularProgress,
  Typography,
} from '@mui/material';
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useTranslation } from 'react-i18next';
import { useQueries } from '@tanstack/react-query';
import { getCashFlowYearly } from '../api/cashFlow';
import ChartTooltip from './ChartTooltip';

const COLORS = {
  cashBalance: '#ff9800',
};

/**
 * キャッシュフローグラフコンポーネント。
 * 月次現金残高推移（折れ線チャート）を表示する。
 * displayMonths が指定された場合は事業年度順（開業月始まり）で表示する。
 */
export default function CashFlowCharts({
  projectId,
  year,
  displayMonths = null,
}: {
  projectId: string;
  year: string;
  displayMonths?: string[] | null;
}) {
  const { t } = useTranslation();

  const calendarYears = displayMonths
    ? [...new Set(displayMonths.map(ym => ym.split('-')[0]))]
    : [year];

  const queryResults = useQueries({
    queries: calendarYears.map(y => ({
      queryKey: ['cashFlowYearly', projectId, y] as const,
      queryFn: () => getCashFlowYearly(projectId, y),
      enabled: Boolean(projectId) && Boolean(y),
    })),
  });

  if (queryResults.some(r => r.isLoading)) {
    return (
      <Box display="flex" justifyContent="center" mt={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (queryResults.some(r => r.isError || !r.data)) {
    return <Alert severity="error">{t('load_error')}</Alert>;
  }

  const allFetchedMonths = queryResults.flatMap(r => r.data!.months);
  const monthDataMap = new Map(allFetchedMonths.map(m => [m.yearMonth, m]));

  // 表示順の月リスト
  const orderedMonths = displayMonths
    ? displayMonths
        .map(ym => monthDataMap.get(ym))
        .filter((m): m is NonNullable<typeof m> => Boolean(m))
    : queryResults[0]!.data!.months;

  const monthlyChartData = orderedMonths.map(m => ({
    name: m.yearMonth.split('-')[1],
    [t('cash_balance')]: m.cashEnding,
    noteJa: m.noteJa,
    noteEn: m.noteEn,
  }));

  return (
    <Box display="flex" flexDirection="column" gap={4}>
      {/* 月次キャッシュフロー推移（折れ線チャート） */}
      <Box>
        <Typography variant="h6" gutterBottom>{t('cash_flow_chart_title')}</Typography>
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={monthlyChartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip content={props => <ChartTooltip {...props} />} />
            <Legend />
            <Line
              type="monotone"
              dataKey={t('cash_balance')}
              stroke={COLORS.cashBalance}
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </Box>
    </Box>
  );
}
