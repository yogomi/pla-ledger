import React from 'react';
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
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCashFlowYearly } from '../hooks/useCashFlow';

/**
 * 年次キャッシュフロー12ヶ月横並び表示テーブルコンポーネント。
 * 各セルをクリックすると該当月の詳細画面へ遷移する。
 */
export default function CashFlowYearlyTable({
  projectId,
  year,
  currency,
}: {
  projectId: string;
  year: string;
  currency: string;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
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

  const months = data.months;
  const yearly = data.yearly;

  const rows = [
    {
      label: t('operating_cf'),
      values: months.map(m => m.operatingCF),
      total: yearly.totalOperatingCF,
    },
    {
      label: t('investing_cf'),
      values: months.map(m => m.investingCF),
      total: yearly.totalInvestingCF,
    },
    {
      label: t('financing_cf'),
      values: months.map(m => m.financingCF),
      total: yearly.totalFinancingCF,
    },
    {
      label: t('net_cash_change'),
      values: months.map(m => m.netCashChange),
      total: yearly.netCashChange,
      bold: true,
    },
    {
      label: t('cash_ending'),
      values: months.map(m => m.cashEnding),
      total: yearly.cashEnding,
      bold: true,
    },
  ];

  return (
    <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
      <Table size="small" sx={{ minWidth: 1000 }}>
        <TableHead>
          <TableRow sx={{ backgroundColor: 'grey.100' }}>
            <TableCell sx={{ minWidth: 160 }}>{t('month_col')}</TableCell>
            {months.map(m => {
              const month = m.yearMonth.split('-')[1];
              return (
                <TableCell
                  key={m.yearMonth}
                  align="right"
                  sx={{ minWidth: 90, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                  onClick={() =>
                    navigate(`/projects/${projectId}/simulation/edit?yearMonth=${m.yearMonth}`)
                  }
                >
                  {t('month_label_short', { month: String(Number(month)) })}
                </TableCell>
              );
            })}
            <TableCell align="right" sx={{ minWidth: 100, fontWeight: 'bold' }}>
              {t('yearly_total')}
            </TableCell>
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
              {row.values.map((v, i) => (
                <TableCell
                  key={months[i].yearMonth}
                  align="right"
                  sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                  onClick={() =>
                    navigate(
                      `/projects/${projectId}/simulation/edit?yearMonth=${months[i].yearMonth}`,
                    )
                  }
                >
                  <Typography
                    variant="body2"
                    fontWeight={row.bold ? 'bold' : 'normal'}
                    color={v < 0 ? 'error.main' : 'inherit'}
                  >
                    {Math.round(v).toLocaleString()}
                  </Typography>
                </TableCell>
              ))}
              <TableCell align="right">
                <Typography
                  variant="body2"
                  fontWeight="bold"
                  color={row.total < 0 ? 'error.main' : 'inherit'}
                >
                  {Math.round(row.total).toLocaleString()} {currency}
                </Typography>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
