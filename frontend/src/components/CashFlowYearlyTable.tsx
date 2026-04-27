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
import { useQueries } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getCashFlowYearly } from '../api/cashFlow';
import { QuarterDef, buildQuarterLabel } from '../utils/quarterUtils';

/**
 * 年次キャッシュフロー表示テーブルコンポーネント。
 * quarterLayout が指定された場合は四半期集計、そうでなければ月次表示。
 * displayMonths が指定された場合は事業年度順（開業月始まり）で表示し、
 * 2暦年にまたがる場合は両年のデータをフェッチして結合する。
 */
export default function CashFlowYearlyTable({
  projectId,
  year,
  currency,
  quarterLayout = null,
  displayMonths = null,
}: {
  projectId: string;
  year: string;
  currency: string;
  quarterLayout?: QuarterDef[] | null;
  displayMonths?: string[] | null;
}) {
  const { t } = useTranslation();

  // 表示対象の暦年を導出（事業年度モードでは2暦年にまたがる場合あり）
  const calendarYears = displayMonths
    ? [...new Set(displayMonths.map(ym => ym.split('-')[0]))]
    : [year];

  const queryResults = useQueries({
    queries: calendarYears.map(y => ({
      queryKey: ['cashFlowYearly', projectId, y] as const,
      queryFn: () => getCashFlowYearly(projectId, y),
      enabled: Boolean(projectId) && Boolean(y),
    })),
  });

  if (queryResults.some(r => r.isLoading)) {
    return (
      <Box display="flex" justifyContent="center" mt={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (queryResults.some(r => r.isError || !r.data)) {
    return <Alert severity="error">{t('load_error')}</Alert>;
  }

  // 全暦年のデータを結合したマップ（yearMonth → 月次データ）
  const allFetchedMonths = queryResults.flatMap(r => r.data!.months);
  const monthDataMap = new Map(allFetchedMonths.map(m => [m.yearMonth, m]));

  // 表示順の月リスト
  type MonthEntry = typeof allFetchedMonths[0];
  const months: MonthEntry[] = displayMonths
    ? displayMonths
        .map(ym => monthDataMap.get(ym))
        .filter((m): m is MonthEntry => Boolean(m))
    : queryResults[0]!.data!.months;

  // 年間合計：事業年度モードは表示対象月から計算、暦年モードはAPIの集計値を使用
  const yearly = displayMonths
    ? {
        totalOperatingCF: months.reduce((s, m) => s + m.operatingCF, 0),
        totalInvestingCF: months.reduce((s, m) => s + m.investingCF, 0),
        totalFinancingCF: months.reduce((s, m) => s + m.financingCF, 0),
        netCashChange: months.reduce((s, m) => s + m.netCashChange, 0),
        cashEnding: months.length > 0 ? months[months.length - 1].cashEnding : 0,
      }
    : queryResults[0]!.data!.yearly;

  // 四半期表示
  if (quarterLayout) {
    const sumCF = (
      field: 'operatingCF' | 'investingCF' | 'financingCF' | 'netCashChange',
      yms: string[],
    ) => yms.reduce((s, ym) => s + (monthDataMap.get(ym)?.[field] ?? 0), 0);

    const lastCashEnding = (yms: string[]) => {
      const lastYm = [...yms].reverse().find(ym => monthDataMap.has(ym));
      return lastYm ? (monthDataMap.get(lastYm)?.cashEnding ?? 0) : 0;
    };

    const rows = [
      {
        label: t('operating_cf'),
        getValue: (yms: string[]) => sumCF('operatingCF', yms),
        total: yearly.totalOperatingCF,
      },
      {
        label: t('investing_cf'),
        getValue: (yms: string[]) => sumCF('investingCF', yms),
        total: yearly.totalInvestingCF,
      },
      {
        label: t('financing_cf'),
        getValue: (yms: string[]) => sumCF('financingCF', yms),
        total: yearly.totalFinancingCF,
      },
      {
        label: t('net_cash_change'),
        getValue: (yms: string[]) => sumCF('netCashChange', yms),
        total: yearly.netCashChange,
        bold: true,
      },
      {
        label: t('cash_ending'),
        getValue: lastCashEnding,
        total: yearly.cashEnding,
        bold: true,
      },
    ];

    return (
      <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: 'grey.100' }}>
              <TableCell sx={{ minWidth: 160 }}>{t('month_col')}</TableCell>
              {quarterLayout.map(q => (
                <TableCell key={q.label} align="right" sx={{ minWidth: 90 }}>
                  {buildQuarterLabel(q)}
                </TableCell>
              ))}
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
                {quarterLayout.map(q => {
                  const v = row.getValue(q.months);
                  return (
                    <TableCell key={q.label} align="right">
                      <Typography
                        variant="body2"
                        fontWeight={row.bold ? 'bold' : 'normal'}
                        color={v < 0 ? 'error.main' : 'inherit'}
                      >
                        {Math.round(v).toLocaleString()}
                      </Typography>
                    </TableCell>
                  );
                })}
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

  // 月次表示
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
                <TableCell key={m.yearMonth} align="right" sx={{ minWidth: 90 }}>
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
                <TableCell key={months[i].yearMonth} align="right">
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
