import { useQueries } from '@tanstack/react-query';
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
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { useTranslation } from 'react-i18next';
import { getExpenseSimulationYearly } from '../api/salesSimulations';
import { ExpenseYearlyData } from '../types/SalesSimulation';

const yFmt = (v: unknown) => typeof v === 'number' ? Math.round(v).toLocaleString() : String(v);

interface ExpenseLongtermViewProps {
  projectId: string;
  /** 表示開始年 (YYYY)。 */
  startYear: string;
  /** 表示する年数。 */
  yearsCount: number;
  /** 通貨コード (例: JPY, USD)。 */
  currency: string;
}

type RowDef = {
  label: string;
  getValue: (data: ExpenseYearlyData | undefined) => number;
  bold?: boolean;
};

/**
 * 経費管理の長期展望コンポーネント。
 * 指定開始年から yearsCount 年分の年間経費（固定費・変動費・人件費・合計）を表示する。
 */
export default function ExpenseLongtermView({
  projectId,
  startYear,
  yearsCount,
  currency,
}: ExpenseLongtermViewProps) {
  const { t } = useTranslation();
  const years = Array.from({ length: yearsCount }, (_, i) => String(Number(startYear) + i));

  const results = useQueries({
    queries: years.map(year => ({
      queryKey: ['expenseSimulationYearly', projectId, year],
      queryFn: () => getExpenseSimulationYearly(projectId, year),
      enabled: Boolean(projectId) && Boolean(year),
    })),
  });

  const isLoading = results.some(r => r.isLoading);
  const isError = results.some(r => r.isError);

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" mt={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (isError) {
    return <Alert severity="error">{t('load_error')}</Alert>;
  }

  const rows: RowDef[] = [
    {
      label: t('fixed_total_row'),
      getValue: data => data?.yearlyTotals.totalFixed ?? 0,
    },
    {
      label: t('labor_total_row'),
      getValue: data => data?.yearlyTotals.totalLabor ?? 0,
    },
    {
      label: t('expense_total_row'),
      getValue: data => data?.yearlyTotals.totalExpense ?? 0,
      bold: true,
    },
  ];

  const chartData = years.map((year, i) => ({
    name: year,
    [t('fixed_total_row')]: results[i].data?.yearlyTotals.totalFixed ?? 0,
    [t('labor_total_row')]: results[i].data?.yearlyTotals.totalLabor ?? 0,
    [t('expense_total_row')]: results[i].data?.yearlyTotals.totalExpense ?? 0,
  }));

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        {t('longterm_expense_title')}
      </Typography>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData} margin={{ top: 4, right: 16, left: 16, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis tickFormatter={yFmt} width={90} />
          <Tooltip formatter={yFmt} />
          <Legend />
          <Line type="monotone" dataKey={t('fixed_total_row')} stroke="#f44336" dot={false} />
          <Line type="monotone" dataKey={t('labor_total_row')} stroke="#2196f3" dot={false} />
          <Line type="monotone" dataKey={t('expense_total_row')} stroke="#9c27b0" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>

      <Divider sx={{ my: 2 }} />
      <Paper variant="outlined" sx={{ overflow: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: 'grey.100' }}>
              <TableCell />
              {years.map(year => (
                <TableCell key={year} align="right">
                  {t('year_label', { year })}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map(row => (
              <TableRow
                key={row.label}
                sx={row.bold ? { backgroundColor: 'grey.50' } : undefined}
              >
                <TableCell>
                  <Typography fontWeight={row.bold ? 'bold' : 'normal'}>
                    {row.label}
                  </Typography>
                </TableCell>
                {results.map((r, i) => (
                  <TableCell key={years[i]} align="right">
                    <Typography fontWeight={row.bold ? 'bold' : 'normal'}>
                      {Math.round(row.getValue(r.data)).toLocaleString()} {row.bold ? currency : ''}
                    </Typography>
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}
