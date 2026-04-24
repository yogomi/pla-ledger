import { useQueries } from '@tanstack/react-query';
import {
  Alert,
  Box,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { getProfitLossYearly } from '../api/salesSimulations';
import { ProfitLossYearlyData } from '../types/SalesSimulation';

interface ProfitLossLongtermTableProps {
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
  getValue: (data: ProfitLossYearlyData | undefined) => number | string;
  bold?: boolean;
  colorized?: boolean;
};

/**
 * 損益計算表の長期展望コンポーネント。
 * 指定開始年から yearsCount 年分の年次損益サマリーを表示する。
 */
export default function ProfitLossLongtermTable({
  projectId,
  startYear,
  yearsCount,
  currency,
}: ProfitLossLongtermTableProps) {
  const { t } = useTranslation();
  const years = Array.from({ length: yearsCount }, (_, i) => String(Number(startYear) + i));

  const results = useQueries({
    queries: years.map(year => ({
      queryKey: ['profitLoss', projectId, year],
      queryFn: () => getProfitLossYearly(projectId, year),
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
      label: `${t('sales_row')} (${currency})`,
      getValue: data => data?.yearly.totalSales ?? 0,
    },
    {
      label: `${t('cost_row')} (${currency})`,
      getValue: data => data?.yearly.totalCost ?? 0,
    },
    {
      label: `${t('fixed_total_row')} (${currency})`,
      getValue: data => data?.yearly.totalFixed ?? 0,
    },
    {
      label: `${t('labor_total_row')} (${currency})`,
      getValue: data => data?.yearly.totalLabor ?? 0,
    },
    {
      label: `${t('expense_total_row')} (${currency})`,
      getValue: data => data?.yearly.totalExpense ?? 0,
    },
    {
      label: `${t('operating_profit')} (${currency})`,
      getValue: data => data?.yearly.totalOperatingProfit ?? 0,
      bold: true,
      colorized: true,
    },
    {
      label: `${t('interest_expense')} (${currency})`,
      getValue: data => data?.yearly.totalInterestExpense ?? 0,
    },
    {
      label: `${t('profit_before_tax')} (${currency})`,
      getValue: data => data?.yearly.totalProfitBeforeTax ?? 0,
      bold: true,
      colorized: true,
    },
    {
      label: `${t('net_profit')} (${currency})`,
      getValue: data => data?.yearly.totalNetProfit ?? 0,
      bold: true,
      colorized: true,
    },
    {
      label: t('profit_rate'),
      getValue: data => `${(data?.yearly.averageProfitRate ?? 0).toFixed(1)}%`,
    },
  ];

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        {t('longterm_profitloss_title')}
      </Typography>
      <TableContainer component={Paper} sx={{ overflow: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: 'grey.100' }}>
              <TableCell sx={{ minWidth: 220 }} />
              {years.map(year => (
                <TableCell key={year} align="right" sx={{ minWidth: 130 }}>
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
                  <Typography fontWeight={row.bold ? 'bold' : 'normal'} variant="body2">
                    {row.label}
                  </Typography>
                </TableCell>
                {results.map((r, i) => {
                  const val = row.getValue(r.data);
                  const numVal = typeof val === 'number' ? val : 0;
                  const color = row.colorized
                    ? numVal >= 0 ? 'success.main' : 'error.main'
                    : 'inherit';
                  return (
                    <TableCell key={years[i]} align="right">
                      <Typography
                        variant="body2"
                        fontWeight={row.bold ? 'bold' : 'normal'}
                        color={color}
                      >
                        {typeof val === 'string' ? val : Math.round(val).toLocaleString()}
                      </Typography>
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
