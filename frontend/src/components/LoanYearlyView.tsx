import React, { useCallback, useEffect, useState } from 'react';
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
import { useLoans, useLoanRepaymentSchedule } from '../hooks/useLoan';
import { Loan, LoanRepayment } from '../types/Loan';

interface LoanYearlyViewProps {
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
 * Recharts の Tooltip formatter。
 * @param v - Tooltip が受け取る値（number | string | その他）
 * @returns 数値の場合は toLocaleString で整形した文字列、それ以外は String() 変換した文字列
 */
const tooltipFormatter = (v: unknown) =>
  typeof v === 'number' ? Math.round(v).toLocaleString() : String(v);

/**
 * 1件の借入の返済スケジュールをフェッチし、データを親に通知するデータローダー。
 * 画面上には何も描画しない。
 */
function LoanScheduleLoader({
  projectId,
  loan,
  onLoad,
}: {
  projectId: string;
  loan: Loan;
  onLoad: (loanId: string, schedule: LoanRepayment[]) => void;
}) {
  const { data } = useLoanRepaymentSchedule(projectId, loan.id);
  useEffect(() => {
    if (data) {
      onLoad(loan.id, data.schedule);
    }
  }, [data, loan.id, onLoad]);
  return null;
}

/**
 * 1件の借入の年次サマリー行を表示するコンポーネント。
 */
function LoanYearRow({
  loan,
  year,
  currency,
}: {
  loan: Loan;
  year: string;
  currency: string;
}) {
  const { t } = useTranslation();
  const { data, isLoading } = useLoanRepaymentSchedule(loan.projectId, loan.id);

  if (isLoading) {
    return (
      <TableRow>
        <TableCell colSpan={5} align="center">
          <CircularProgress size={16} />
        </TableCell>
      </TableRow>
    );
  }

  const yearSchedule = (data?.schedule ?? []).filter(r => r.yearMonth.startsWith(year));
  const annualPrincipal = yearSchedule.reduce((sum, r) => sum + r.principalPayment, 0);
  const annualInterest = yearSchedule.reduce((sum, r) => sum + r.interestPayment, 0);
  const lastEntry = yearSchedule[yearSchedule.length - 1];
  const yearEndBalance = lastEntry ? lastEntry.remainingBalance : loan.remainingBalance;

  return (
    <TableRow>
      <TableCell>{loan.lenderName}</TableCell>
      <TableCell align="right">{Math.round(loan.principalAmount).toLocaleString()} {currency}</TableCell>
      <TableCell align="right">{Math.round(annualPrincipal).toLocaleString()} {currency}</TableCell>
      <TableCell align="right">{Math.round(annualInterest).toLocaleString()} {currency}</TableCell>
      <TableCell align="right">{Math.round(yearEndBalance).toLocaleString()} {currency}</TableCell>
    </TableRow>
  );
}

/**
 * 借入管理の年次表示コンポーネント。
 * 各ローンの年間返済額と残高推移表、月次残高グラフを表示する。
 */
export default function LoanYearlyView({ projectId, year, currency }: LoanYearlyViewProps) {
  const { t } = useTranslation();
  const { data: loansData, isLoading: loansLoading, isError: loansError } = useLoans(projectId);

  // 各ローンの返済スケジュールを管理するマップ (loanId -> schedule)
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

  // グラフ用のデータを生成する（12か月分の各ローン残高）
  const allMonths = Array.from({ length: 12 }, (_, i) => {
    const m = String(i + 1).padStart(2, '0');
    return `${year}-${m}`;
  });

  const chartData = allMonths.map(ym => {
    const entry: Record<string, number | string> = {
      name: ym.split('-')[1],
    };
    loans.forEach(loan => {
      const schedule = scheduleMap.get(loan.id) ?? [];
      const row = schedule.find(r => r.yearMonth === ym);
      if (row) {
        // スケジュールに含まれる月：スケジュールの残高を使用
        entry[loan.lenderName] = row.remainingBalance;
      } else {
        // スケジュールに含まれない月：借入日と比較
        const loanYearMonth = loan.loanDate.substring(0, 7); // "YYYY-MM-DD" → "YYYY-MM"
        if (ym >= loanYearMonth) {
          // 借入日以降でスケジュール開始前：元本額を表示
          entry[loan.lenderName] = loan.principalAmount;
        } else {
          // 借入日より前：残高なし
          entry[loan.lenderName] = 0;
        }
      }
    });
    return entry;
  });

  return (
    <Box>
      {/* 各ローンのスケジュールをバックグラウンドでフェッチするローダー */}
      {loans.map(loan => (
        <LoanScheduleLoader
          key={loan.id}
          projectId={projectId}
          loan={loan}
          onLoad={handleScheduleLoad}
        />
      ))}

      <Typography variant="h6" gutterBottom>
        {t('yearly_loan_summary')} ({t('year_label', { year })})
      </Typography>

      {loans.length === 0 ? (
        <Alert severity="info">{t('no_loans')}</Alert>
      ) : (
        <>
          {/* 年次借入サマリー表 */}
          <Paper variant="outlined" sx={{ overflow: 'auto', mb: 3 }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: 'grey.100' }}>
                  <TableCell>{t('lender_name')}</TableCell>
                  <TableCell align="right">{t('principal_amount')}</TableCell>
                  <TableCell align="right">{t('annual_repayment')}</TableCell>
                  <TableCell align="right">{t('annual_interest')}</TableCell>
                  <TableCell align="right">{t('year_end_balance')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loans.map(loan => (
                  <LoanYearRow
                    key={loan.id}
                    loan={loan}
                    year={year}
                    currency={currency}
                  />
                ))}
              </TableBody>
            </Table>
          </Paper>

          <Divider sx={{ my: 2 }} />

          {/* 月次残高グラフ（各ローンの残高推移） */}
          <Typography variant="h6" gutterBottom>
            {t('loan_yearly_chart_title')} ({currency})
          </Typography>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis tickFormatter={v => Number(v).toLocaleString()} />
              <Tooltip formatter={tooltipFormatter} />
              <Legend />
              {loans.map((loan, idx) => (
                <Line
                  key={loan.id}
                  type="monotone"
                  dataKey={loan.lenderName}
                  stroke={CHART_COLORS[idx % CHART_COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </>
      )}
    </Box>
  );
}
