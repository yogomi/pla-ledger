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
import { useLoanRepaymentSchedule } from '../hooks/useLoan';

interface LoanRepaymentScheduleTableProps {
  projectId: string;
  loanId: string;
  /** 通貨コード (例: JPY, USD)。金額表示に使用する。 */
  currency: string;
}

/**
 * 返済スケジュールをテーブル形式で表示するコンポーネント。
 * 年月・元金返済額・利息支払額・残高を列表示し、合計行を追加する。
 */
export default function LoanRepaymentScheduleTable({
  projectId,
  loanId,
  currency,
}: LoanRepaymentScheduleTableProps) {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useLoanRepaymentSchedule(projectId, loanId);

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" mt={2}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (isError || !data) {
    return <Alert severity="error">{t('load_error')}</Alert>;
  }

  const { schedule } = data;

  const totalPrincipal = schedule.reduce((sum, r) => sum + r.principalPayment, 0);
  const totalInterest = schedule.reduce((sum, r) => sum + r.interestPayment, 0);
  const totalRepayment = totalPrincipal + totalInterest;

  return (
    <Paper variant="outlined" sx={{ overflow: 'auto' }}>
      <Table size="small">
        <TableHead>
          <TableRow sx={{ backgroundColor: 'grey.100' }}>
            <TableCell>{t('year_month')}</TableCell>
            <TableCell align="right">{t('principal_payment')} ({currency})</TableCell>
            <TableCell align="right">{t('interest_payment')} ({currency})</TableCell>
            <TableCell align="right">{t('remaining_balance')} ({currency})</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {schedule.map(row => (
            <TableRow key={row.yearMonth}>
              <TableCell>{row.yearMonth}</TableCell>
              <TableCell align="right">{Math.round(row.principalPayment).toLocaleString()}</TableCell>
              <TableCell align="right">{Math.round(row.interestPayment).toLocaleString()}</TableCell>
              <TableCell align="right">{Math.round(row.remainingBalance).toLocaleString()}</TableCell>
            </TableRow>
          ))}
          {/* 合計行 */}
          <TableRow sx={{ backgroundColor: 'grey.50' }}>
            <TableCell><Typography fontWeight="bold">{t('total')}</Typography></TableCell>
            <TableCell align="right">
              <Typography fontWeight="bold">{Math.round(totalPrincipal).toLocaleString()}</Typography>
            </TableCell>
            <TableCell align="right">
              <Typography fontWeight="bold">{Math.round(totalInterest).toLocaleString()}</Typography>
            </TableCell>
            <TableCell align="right">
              <Typography variant="body2" color="text.secondary">
                {t('total_repayment')}: {Math.round(totalRepayment).toLocaleString()}
              </Typography>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </Paper>
  );
}
