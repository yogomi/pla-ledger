import React from 'react';
import {
  Alert,
  Box,
  CircularProgress,
  Divider,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useTranslation } from 'react-i18next';
import { useSalesSimulationYearly } from '../hooks/useSalesSimulation';
import ChartTooltip from './ChartTooltip';

interface SalesYearlyViewProps {
  projectId: string;
  /** 表示する年 (YYYY)。親コンポーネントで管理する。 */
  year: string;
  /** 通貨コード (例: JPY, USD)。金額表示に使用する。 */
  currency: string;
}

/** グラフのカラーパレット */
const CHART_COLORS = [
  '#4caf50', '#2196f3', '#ff9800', '#f44336', '#9c27b0',
  '#00bcd4', '#ffeb3b', '#795548', '#607d8b', '#e91e63',
];

/**
 * 売上シミュレーションの年次表示コンポーネント。
 * カテゴリー別の年間売上集計表と月次売上推移グラフを表示する。
 */
export default function SalesYearlyView({ projectId, year, currency }: SalesYearlyViewProps) {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useSalesSimulationYearly(projectId, year);

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

  /** 月次グラフ用データ（カテゴリー別の売上） */
  const chartData = data.monthlyTotals.map((mt, idx) => {
    const month = mt.yearMonth.split('-')[1];
    const entry: Record<string, number | string | null> = {
      name: month,
      noteJa: mt.noteJa,
      noteEn: mt.noteEn,
    };
    data.categories.forEach(cat => {
      const m = cat.months[idx];
      entry[cat.categoryName] = m ? m.monthlySales : 0;
    });
    return entry;
  });

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        {t('yearly_sales_by_category')} ({t('year_label', { year })})
      </Typography>

      {/* カテゴリー別年間売上表 */}
      <Paper variant="outlined" sx={{ overflow: 'auto', mb: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: 'grey.100' }}>
              <TableCell>{t('category_name_col')}</TableCell>
              {data.monthlyTotals.map(mt => {
                const m = mt.yearMonth.split('-')[1];
                return (
                  <TableCell key={mt.yearMonth} align="right">
                    {t('month_label_short', { month: Number(m) })}
                  </TableCell>
                );
              })}
              <TableCell align="right">{t('category_total')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.categories.map(cat => (
              <TableRow key={cat.categoryId}>
                <TableCell>{cat.categoryName}</TableCell>
                {cat.months.map(m => (
                  <TableCell key={m.yearMonth} align="right">
                    {Math.round(m.monthlySales).toLocaleString()}
                  </TableCell>
                ))}
                <TableCell align="right">
                  <Typography fontWeight="bold">
                    {Math.round(cat.yearlyTotal).toLocaleString()}
                  </Typography>
                </TableCell>
              </TableRow>
            ))}
            {/* 月次合計行 */}
            <TableRow sx={{ backgroundColor: 'grey.50' }}>
              <TableCell>
                <Typography fontWeight="bold">{t('yearly_total')}</Typography>
              </TableCell>
              {data.monthlyTotals.map(mt => (
                <TableCell key={mt.yearMonth} align="right">
                  <Typography fontWeight="bold">
                    {Math.round(mt.totalSales).toLocaleString()}
                  </Typography>
                </TableCell>
              ))}
              <TableCell align="right">
                <Typography fontWeight="bold">
                  {Math.round(data.yearlyTotal).toLocaleString()}
                </Typography>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Paper>

      <Divider sx={{ my: 2 }} />

      {/* 月次売上推移グラフ */}
      <Typography variant="h6" gutterBottom>
        {t('sales_yearly_chart_title')} ({currency})
      </Typography>
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis tickFormatter={v => Number(v).toLocaleString()} />
          <Tooltip content={props => <ChartTooltip {...props} />} />
          <Legend />
          {data.categories.map((cat, idx) => (
            <Line
              key={cat.categoryId}
              type="monotone"
              dataKey={cat.categoryName}
              stroke={CHART_COLORS[idx % CHART_COLORS.length]}
              dot={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
}
