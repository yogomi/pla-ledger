import React from 'react';
import {
  Alert,
  Box,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useProfitLossYearly } from '../hooks/useSalesSimulation';

interface ProfitLossYearlyTableProps {
  projectId: string;
  year: string;
  /** 通貨コード (例: JPY, USD)。列ヘッダーに表示する。 */
  currency: string;
}

/**
 * 指定年の損益計算書を月次一覧で表示するコンポーネント。
 * 最終行に年次合計を表示する。
 */
export default function ProfitLossYearlyTable({ projectId, year, currency }: ProfitLossYearlyTableProps) {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useProfitLossYearly(projectId, year);

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

  const { months, yearly } = data;

  return (
    <Box>
      <Paper variant="outlined" sx={{ overflow: 'auto' }}>
      <Table size="small">
        <TableHead>
          <TableRow sx={{ backgroundColor: 'grey.100' }}>
            <TableCell>{t('month_col')}</TableCell>
            <TableCell align="right">{t('sales_row')} ({currency})</TableCell>
            <TableCell align="right">{t('cost_row')} ({currency})</TableCell>
            <TableCell align="right">{t('fixed_expenses_section')} ({currency})</TableCell>
            <TableCell align="right">{t('variable_expenses_section')} ({currency})</TableCell>
            <TableCell align="right">{t('labor_cost_section')} ({currency})</TableCell>
            <TableCell align="right">{t('depreciation')} ({currency})</TableCell>
            <TableCell align="right">{t('expense_total_row')} ({currency})</TableCell>
            <TableCell align="right">{t('operating_profit')} ({currency})</TableCell>
            <TableCell align="right">{t('interest_expense')} ({currency})</TableCell>
            <TableCell align="right">{t('profit_before_tax')} ({currency})</TableCell>
            <TableCell align="right">{t('net_profit')} ({currency})</TableCell>
            <TableCell align="right">{t('profit_rate')}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {months.map(row => {
            const [, m] = row.yearMonth.split('-');
            return (
              <TableRow key={row.yearMonth}>
                <TableCell>
                  <Box display="flex" alignItems="center" gap={0.5}>
                    {t('month_label_short', { month: Number(m) })}
                    {row.isInherited && (
                      <Typography variant="caption" color="text.secondary">
                        {t('inherited_badge')}
                      </Typography>
                    )}
                  </Box>
                </TableCell>
                <TableCell align="right">{Math.round(row.monthlySales).toLocaleString()}</TableCell>
                <TableCell align="right">{Math.round(row.monthlyCost).toLocaleString()}</TableCell>
                <TableCell align="right">{Math.round(row.fixedTotal).toLocaleString()}</TableCell>
                <TableCell align="right">{Math.round(row.variableTotal).toLocaleString()}</TableCell>
                <TableCell align="right">{Math.round(row.laborTotal ?? 0).toLocaleString()}</TableCell>
                <TableCell align="right">{Math.round(row.depreciation ?? 0).toLocaleString()}</TableCell>
                <TableCell align="right">{Math.round(row.totalExpense).toLocaleString()}</TableCell>
                <TableCell
                  align="right"
                  sx={{ color: row.operatingProfit >= 0 ? 'success.main' : 'error.main' }}
                >
                  {Math.round(row.operatingProfit).toLocaleString()}
                </TableCell>
                <TableCell align="right">{Math.round(row.interestExpense).toLocaleString()}</TableCell>
                <TableCell
                  align="right"
                  sx={{ color: row.profitBeforeTax >= 0 ? 'success.main' : 'error.main' }}
                >
                  {Math.round(row.profitBeforeTax).toLocaleString()}
                </TableCell>
                <TableCell
                  align="right"
                  sx={{ color: row.netProfit >= 0 ? 'success.main' : 'error.main' }}
                >
                  {Math.round(row.netProfit).toLocaleString()}
                </TableCell>
                <TableCell align="right">
                  {`${row.profitRate.toFixed(1)}%`}
                </TableCell>
              </TableRow>
            );
          })}
          {/* 年次合計行 */}
          <TableRow sx={{ backgroundColor: 'grey.50', fontWeight: 'bold' }}>
            <TableCell><Typography fontWeight="bold">{t('yearly_total')}</Typography></TableCell>
            <TableCell align="right">
              <Typography fontWeight="bold">{Math.round(yearly.totalSales).toLocaleString()}</Typography>
            </TableCell>
            <TableCell align="right">
              <Typography fontWeight="bold">{Math.round(yearly.totalCost).toLocaleString()}</Typography>
            </TableCell>
            <TableCell align="right">
              <Typography fontWeight="bold">{Math.round(yearly.totalFixed).toLocaleString()}</Typography>
            </TableCell>
            <TableCell align="right">
              <Typography fontWeight="bold">{Math.round(yearly.totalVariable).toLocaleString()}</Typography>
            </TableCell>
            <TableCell align="right">
              <Typography fontWeight="bold">
                {Math.round(yearly.totalLabor ?? 0).toLocaleString()}
              </Typography>
            </TableCell>
            <TableCell align="right">
              <Typography fontWeight="bold">
                {Math.round(yearly.totalDepreciation ?? 0).toLocaleString()}
              </Typography>
            </TableCell>
            <TableCell align="right">
              <Typography fontWeight="bold">{Math.round(yearly.totalExpense).toLocaleString()}</Typography>
            </TableCell>
            <TableCell
              align="right"
              sx={{ color: yearly.totalOperatingProfit >= 0 ? 'success.main' : 'error.main' }}
            >
              <Typography fontWeight="bold">
                {Math.round(yearly.totalOperatingProfit).toLocaleString()}
              </Typography>
            </TableCell>
            <TableCell align="right">
              <Typography fontWeight="bold">
                {Math.round(yearly.totalInterestExpense).toLocaleString()}
              </Typography>
            </TableCell>
            <TableCell
              align="right"
              sx={{ color: yearly.totalProfitBeforeTax >= 0 ? 'success.main' : 'error.main' }}
            >
              <Typography fontWeight="bold">
                {Math.round(yearly.totalProfitBeforeTax).toLocaleString()}
              </Typography>
            </TableCell>
            <TableCell
              align="right"
              sx={{ color: yearly.totalNetProfit >= 0 ? 'success.main' : 'error.main' }}
            >
              <Typography fontWeight="bold">
                {Math.round(yearly.totalNetProfit).toLocaleString()}
              </Typography>
            </TableCell>
            <TableCell align="right">
              <Typography fontWeight="bold">
                {`${yearly.averageProfitRate.toFixed(1)}%`}
              </Typography>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </Paper>
    </Box>
  );
}
