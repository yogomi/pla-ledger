import React from 'react';
import {
  Alert,
  Box,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useProfitLossYearly } from '../hooks/useSalesSimulation';

interface ProfitLossMonthlyViewProps {
  projectId: string;
  yearMonth: string;
  /** 通貨コード (例: JPY, USD)。列ヘッダーに表示する。 */
  currency: string;
}

/**
 * 指定年月の損益計算書を縦表示するコンポーネント。
 * 売上高・原価・各経費・営業利益・当期純利益を一覧で表示する。
 */
export default function ProfitLossMonthlyView({
  projectId,
  yearMonth,
  currency,
}: ProfitLossMonthlyViewProps) {
  const { t } = useTranslation();
  const year = yearMonth.split('-')[0];
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

  const row = data.months.find(m => m.yearMonth === yearMonth);

  if (!row) {
    return <Alert severity="warning">{t('load_error')}</Alert>;
  }

  /** 行を描画するヘルパー */
  const renderRow = (label: string, value: number, bold?: boolean, colored?: boolean) => (
    <TableRow key={label}>
      <TableCell sx={{ width: '60%' }}>
        {bold ? <Typography fontWeight="bold">{label}</Typography> : label}
      </TableCell>
      <TableCell align="right">
        {bold ? (
          <Typography
            fontWeight="bold"
            color={colored ? (value >= 0 ? 'success.main' : 'error.main') : undefined}
          >
            {value.toLocaleString()}
          </Typography>
        ) : (
          <Typography
            color={colored ? (value >= 0 ? 'success.main' : 'error.main') : undefined}
          >
            {value.toLocaleString()}
          </Typography>
        )}
      </TableCell>
    </TableRow>
  );

  return (
    <Box>
      {row.isInherited && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {t('inherited_info_sales')}
        </Alert>
      )}
      <Paper variant="outlined">
        <Table size="small">
          <TableBody>
            {renderRow(`${t('sales_row')} (${currency})`, row.monthlySales)}
            {renderRow(`${t('cost_row')} (${currency})`, row.monthlyCost)}
            {renderRow(`${t('fixed_expenses_section')} (${currency})`, row.fixedTotal)}
            {renderRow(`${t('variable_expenses_section')} (${currency})`, row.variableTotal)}
            {renderRow(`${t('labor_cost_section')} (${currency})`, row.laborTotal ?? 0)}
            {renderRow(`${t('depreciation')} (${currency})`, row.depreciation ?? 0)}
            {renderRow(`${t('expense_total_row')} (${currency})`, row.totalExpense, true)}
            {renderRow(`${t('operating_profit')} (${currency})`, row.operatingProfit, true, true)}
            {renderRow(`${t('interest_expense')} (${currency})`, row.interestExpense)}
            {renderRow(`${t('net_profit')} (${currency})`, row.netProfit, true, true)}
            <TableRow>
              <TableCell>{t('profit_rate')}</TableCell>
              <TableCell align="right">{`${row.profitRate.toFixed(1)}%`}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}
