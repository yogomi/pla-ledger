import React from 'react';
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
import { useCashFlowYearly } from '../hooks/useCashFlow';

const COLORS = {
  cashBalance: '#ff9800',
};

/**
 * Recharts の Tooltip formatter。
 * @param v - Tooltip が受け取る値（number | string | その他）
 * @returns 数値の場合は整数に丸めて toLocaleString で整形した文字列、それ以外は String() 変換した文字列
 */
const tooltipFormatter = (v: unknown) =>
  typeof v === 'number' ? Math.round(v).toLocaleString() : String(v);

/**
 * キャッシュフローグラフコンポーネント。
 * 月次現金残高推移（折れ線チャート）を表示する。
 */
export default function CashFlowCharts({
  projectId,
  year,
}: {
  projectId: string;
  year: string;
}) {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useCashFlowYearly(projectId, year);

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" mt={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (isError || !data) {
    return <Alert severity="error">{t('load_error')}</Alert>;
  }

  // 月次推移チャート用データ
  const monthlyChartData = data.months.map(m => ({
    name: m.yearMonth.split('-')[1],
    [t('cash_balance')]: m.cashEnding,
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
            <Tooltip formatter={tooltipFormatter} />
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
