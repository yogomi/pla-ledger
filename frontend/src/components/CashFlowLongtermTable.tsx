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
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { useTranslation } from 'react-i18next';
import { getCashFlowYearly } from '../api/cashFlow';
import { CashFlowYearlyData } from '../types/CashFlow';

const yFmt = (v: unknown) => typeof v === 'number' ? Math.round(v).toLocaleString() : String(v);

interface CashFlowLongtermTableProps {
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
  getValue: (data: CashFlowYearlyData | undefined) => number;
  bold?: boolean;
};

/**
 * キャッシュフローの長期展望コンポーネント。
 * 指定開始年から yearsCount 年分の年次キャッシュフロー合計を表示する。
 */
export default function CashFlowLongtermTable({
  projectId,
  startYear,
  yearsCount,
  currency,
}: CashFlowLongtermTableProps) {
  const { t } = useTranslation();
  const years = Array.from({ length: yearsCount }, (_, i) => String(Number(startYear) + i));

  const results = useQueries({
    queries: years.map(year => ({
      queryKey: ['cashFlowYearly', projectId, year],
      queryFn: () => getCashFlowYearly(projectId, year),
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
      label: t('operating_cf'),
      getValue: data => data?.yearly.totalOperatingCF ?? 0,
    },
    {
      label: t('investing_cf'),
      getValue: data => data?.yearly.totalInvestingCF ?? 0,
    },
    {
      label: t('financing_cf'),
      getValue: data => data?.yearly.totalFinancingCF ?? 0,
    },
    {
      label: t('net_cash_change'),
      getValue: data => data?.yearly.netCashChange ?? 0,
      bold: true,
    },
    {
      label: t('cash_ending'),
      getValue: data => data?.yearly.cashEnding ?? 0,
      bold: true,
    },
  ];

  const chartData = years.map((year, i) => ({
    name: year,
    [t('operating_cf')]: results[i].data?.yearly.totalOperatingCF ?? 0,
    [t('investing_cf')]: results[i].data?.yearly.totalInvestingCF ?? 0,
    [t('financing_cf')]: results[i].data?.yearly.totalFinancingCF ?? 0,
    [t('cash_ending')]: results[i].data?.yearly.cashEnding ?? 0,
  }));

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        {t('longterm_cashflow_title')}
      </Typography>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData} margin={{ top: 4, right: 16, left: 16, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis tickFormatter={yFmt} width={90} />
          <Tooltip formatter={yFmt} />
          <Legend />
          <Line type="monotone" dataKey={t('operating_cf')} stroke="#4caf50" dot={false} />
          <Line type="monotone" dataKey={t('investing_cf')} stroke="#f44336" dot={false} />
          <Line type="monotone" dataKey={t('financing_cf')} stroke="#2196f3" dot={false} />
          <Line type="monotone" dataKey={t('cash_ending')} stroke="#9c27b0" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>

      <Divider sx={{ my: 2 }} />
      <TableContainer component={Paper} sx={{ overflow: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: 'grey.100' }}>
              <TableCell sx={{ minWidth: 220 }} />
              {years.map(year => (
                <TableCell key={year} align="right" sx={{ minWidth: 120 }}>
                  {t('year_label', { year })}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map(row => (
              <TableRow key={row.label}>
                <TableCell>
                  <Typography fontWeight={row.bold ? 'bold' : 'normal'} variant="body2">
                    {row.label}
                  </Typography>
                </TableCell>
                {results.map((r, i) => {
                  const val = row.getValue(r.data);
                  return (
                    <TableCell key={years[i]} align="right">
                      <Typography
                        variant="body2"
                        fontWeight={row.bold ? 'bold' : 'normal'}
                        color={val < 0 ? 'error.main' : 'inherit'}
                      >
                        {Math.round(val).toLocaleString()} {row.bold ? currency : ''}
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
