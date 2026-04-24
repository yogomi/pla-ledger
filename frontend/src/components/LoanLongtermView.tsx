import { useCallback, useEffect, useState } from 'react';
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
import { useLoans, useLoanRepaymentSchedule } from '../hooks/useLoan';
import { Loan, LoanRepayment } from '../types/Loan';

const LINE_COLORS = ['#2196f3', '#4caf50', '#f44336', '#ff9800', '#9c27b0', '#00bcd4'];
const yFmt = (v: unknown) => typeof v === 'number' ? Math.round(v).toLocaleString() : String(v);

interface LoanLongtermViewProps {
  projectId: string;
  /** 表示開始年 (YYYY)。 */
  startYear: string;
  /** 表示する年数。 */
  yearsCount: number;
  /** 通貨コード (例: JPY, USD)。 */
  currency: string;
}

/**
 * 1件の借入の長期展望行を表示するコンポーネント。
 * 各年の年末残高を表示し、スケジュールデータを親へ通知する。
 */
function LoanLongtermRow({
  loan,
  years,
  currency,
  onScheduleLoad,
}: {
  loan: Loan;
  years: string[];
  currency: string;
  onScheduleLoad: (loanId: string, schedule: LoanRepayment[]) => void;
}) {
  const { data, isLoading } = useLoanRepaymentSchedule(loan.projectId, loan.id);

  useEffect(() => {
    if (data) {
      onScheduleLoad(loan.id, data.schedule);
    }
  }, [data, loan.id, onScheduleLoad]);

  if (isLoading) {
    return (
      <TableRow>
        <TableCell colSpan={years.length + 1} align="center">
          <CircularProgress size={16} />
        </TableCell>
      </TableRow>
    );
  }

  const schedule = data?.schedule ?? [];

  return (
    <TableRow>
      <TableCell>{loan.lenderName}</TableCell>
      {years.map(year => {
        const yearSchedule = schedule.filter(r => r.yearMonth.startsWith(year));
        if (yearSchedule.length === 0) {
          return (
            <TableCell key={year} align="right">
              -
            </TableCell>
          );
        }
        const lastEntry = yearSchedule[yearSchedule.length - 1];
        return (
          <TableCell key={year} align="right">
            {Math.round(lastEntry.remainingBalance).toLocaleString()} {currency}
          </TableCell>
        );
      })}
    </TableRow>
  );
}

/**
 * 借入管理の長期展望コンポーネント。
 * 指定開始年から yearsCount 年分の年末残高と年間返済合計を表示する。
 */
export default function LoanLongtermView({
  projectId,
  startYear,
  yearsCount,
  currency,
}: LoanLongtermViewProps) {
  const { t } = useTranslation();
  const years = Array.from({ length: yearsCount }, (_, i) => String(Number(startYear) + i));
  const { data: loansData, isLoading: loansLoading, isError: loansError } = useLoans(projectId);
  const [scheduleMap, setScheduleMap] = useState<Map<string, LoanRepayment[]>>(new Map());

  const handleScheduleLoad = useCallback((loanId: string, schedule: LoanRepayment[]) => {
    setScheduleMap(prev => {
      const next = new Map(prev);
      next.set(loanId, schedule);
      return next;
    });
  }, []);

  if (loansLoading) {
    return (
      <Box display="flex" justifyContent="center" mt={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (loansError) {
    return <Alert severity="error">{t('load_error')}</Alert>;
  }

  const loans = loansData?.loans ?? [];

  const chartData = years.map(year => {
    const entry: Record<string, number | string> = { name: year };
    loans.forEach(loan => {
      const schedule = scheduleMap.get(loan.id) ?? [];
      const yearSchedule = schedule.filter(r => r.yearMonth.startsWith(year));
      entry[loan.lenderName] = yearSchedule.length > 0
        ? yearSchedule[yearSchedule.length - 1].remainingBalance
        : 0;
    });
    return entry;
  });

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        {t('longterm_loan_title')}
      </Typography>
      {loans.length === 0 ? (
        <Alert severity="info">{t('no_loans')}</Alert>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData} margin={{ top: 4, right: 16, left: 16, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis tickFormatter={yFmt} width={90} />
              <Tooltip formatter={yFmt} />
              <Legend />
              {loans.map((loan, idx) => (
                <Line
                  key={loan.id}
                  type="monotone"
                  dataKey={loan.lenderName}
                  stroke={LINE_COLORS[idx % LINE_COLORS.length]}
                  dot={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
          <Divider sx={{ my: 2 }} />
          <Paper variant="outlined" sx={{ overflow: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: 'grey.100' }}>
                <TableCell>{t('lender_name')}</TableCell>
                {years.map(year => (
                  <TableCell key={year} align="right">
                    {t('year_label', { year })}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {loans.map(loan => (
                <LoanLongtermRow
                  key={loan.id}
                  loan={loan}
                  years={years}
                  currency={currency}
                  onScheduleLoad={handleScheduleLoad}
                />
              ))}
              {/* 年間返済合計行 */}
              <TableRow sx={{ backgroundColor: 'grey.50' }}>
                <TableCell>
                  <Typography fontWeight="bold">{t('annual_repayment')}</Typography>
                </TableCell>
                {years.map(year => {
                  const total = loans.reduce((sum, loan) => {
                    const schedule = scheduleMap.get(loan.id) ?? [];
                    const yearSchedule = schedule.filter(r => r.yearMonth.startsWith(year));
                    const annualPayment = yearSchedule.reduce(
                      (s, r) => s + r.principalPayment + r.interestPayment,
                      0,
                    );
                    return sum + annualPayment;
                  }, 0);
                  return (
                    <TableCell key={year} align="right">
                      <Typography fontWeight="bold">
                        {Math.round(total).toLocaleString()} {currency}
                      </Typography>
                    </TableCell>
                  );
                })}
              </TableRow>
            </TableBody>
          </Table>
        </Paper>
        </>
      )}
    </Box>
  );
}
