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
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useQueries } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getProfitLossYearly } from '../api/salesSimulations';
import ChartTooltip from './ChartTooltip';
import { QuarterDef, buildQuarterLabel } from '../utils/quarterUtils';
import { MonthlyProfitLoss } from '../types/SalesSimulation';

const CHART_COLORS = {
  sales: '#4caf50',
  operatingProfit: '#2196f3',
  netProfit: '#ff9800',
};

interface ProfitLossYearlyTableProps {
  projectId: string;
  year: string;
  /** 通貨コード (例: JPY, USD)。列ヘッダーに表示する。 */
  currency: string;
  /** 四半期レイアウト。null の場合は月次表示。 */
  quarterLayout?: QuarterDef[] | null;
  /** 表示対象の12ヶ月 (YYYY-MM)。事業年度モード時に開業月始まりで渡される。 */
  displayMonths?: string[] | null;
}

/** 月次データを四半期に集計する */
function aggregateToQuarter(
  monthDataMap: Map<string, MonthlyProfitLoss>,
  qMonths: string[],
): Omit<MonthlyProfitLoss, 'yearMonth' | 'isInherited' | 'noteJa' | 'noteEn'> {
  const rows = qMonths.map(ym => monthDataMap.get(ym)).filter((m): m is MonthlyProfitLoss => Boolean(m));
  const sum = (fn: (m: MonthlyProfitLoss) => number) => rows.reduce((s, m) => s + fn(m), 0);

  const monthlySales = sum(m => m.monthlySales);
  const operatingProfit = sum(m => m.operatingProfit);

  return {
    monthlySales,
    monthlyCost: sum(m => m.monthlyCost),
    fixedTotal: sum(m => m.fixedTotal),
    laborTotal: sum(m => m.laborTotal ?? 0),
    depreciation: sum(m => m.depreciation ?? 0),
    totalExpense: sum(m => m.totalExpense),
    operatingProfit,
    interestExpense: sum(m => m.interestExpense),
    profitBeforeTax: sum(m => m.profitBeforeTax),
    netProfit: sum(m => m.netProfit),
    profitRate: monthlySales > 0 ? (operatingProfit / monthlySales) * 100 : 0,
  };
}

/**
 * 指定年の損益計算書を月次 or 四半期一覧で表示するコンポーネント。
 * displayMonths が指定された場合は事業年度順で表示し、2暦年にまたがる場合は両年をフェッチする。
 */
export default function ProfitLossYearlyTable({
  projectId,
  year,
  currency,
  quarterLayout = null,
  displayMonths = null,
}: ProfitLossYearlyTableProps) {
  const { t } = useTranslation();

  const calendarYears = displayMonths
    ? [...new Set(displayMonths.map(ym => ym.split('-')[0]))]
    : [year];

  const queryResults = useQueries({
    queries: calendarYears.map(y => ({
      queryKey: ['profitLoss', projectId, y] as const,
      queryFn: () => getProfitLossYearly(projectId, y),
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

  const allFetchedMonths = queryResults.flatMap(r => r.data!.months);
  const monthDataMap = new Map(allFetchedMonths.map(m => [m.yearMonth, m]));

  // 表示順の月リスト
  const months: MonthlyProfitLoss[] = displayMonths
    ? displayMonths.map(ym => monthDataMap.get(ym)).filter((m): m is MonthlyProfitLoss => Boolean(m))
    : queryResults[0]!.data!.months;

  // 年間合計
  const yearly = (() => {
    if (!displayMonths) return queryResults[0]!.data!.yearly;
    const totalSales = months.reduce((s, m) => s + m.monthlySales, 0);
    const totalOperatingProfit = months.reduce((s, m) => s + m.operatingProfit, 0);
    return {
      totalSales,
      totalCost: months.reduce((s, m) => s + m.monthlyCost, 0),
      totalFixed: months.reduce((s, m) => s + m.fixedTotal, 0),
      totalLabor: months.reduce((s, m) => s + m.laborTotal, 0),
      totalDepreciation: months.reduce((s, m) => s + (m.depreciation ?? 0), 0),
      totalExpense: months.reduce((s, m) => s + m.totalExpense, 0),
      totalOperatingProfit,
      totalInterestExpense: months.reduce((s, m) => s + m.interestExpense, 0),
      totalProfitBeforeTax: months.reduce((s, m) => s + m.profitBeforeTax, 0),
      totalNetProfit: months.reduce((s, m) => s + m.netProfit, 0),
      averageProfitRate: totalSales > 0 ? (totalOperatingProfit / totalSales) * 100 : 0,
    };
  })();

  const chartData = months.map(m => {
    const [, month] = m.yearMonth.split('-');
    return {
      name: month,
      [t('sales_row')]: Math.round(m.monthlySales),
      [t('operating_profit')]: Math.round(m.operatingProfit),
      [t('net_profit')]: Math.round(m.netProfit),
      noteJa: m.noteJa,
      noteEn: m.noteEn,
    };
  });

  return (
    <Box display="flex" flexDirection="column" gap={3}>
      {/* 月次損益推移グラフ（グラフは常に月次表示） */}
      <Box>
        <Typography variant="h6" gutterBottom>{t('profit_loss_yearly_label')}</Typography>
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip content={props => <ChartTooltip {...props} />} />
            <Legend />
            <Line
              type="monotone"
              dataKey={t('sales_row')}
              stroke={CHART_COLORS.sales}
              strokeWidth={2}
              dot={{ r: 3 }}
            />
            <Line
              type="monotone"
              dataKey={t('operating_profit')}
              stroke={CHART_COLORS.operatingProfit}
              strokeWidth={2}
              dot={{ r: 3 }}
            />
            <Line
              type="monotone"
              dataKey={t('net_profit')}
              stroke={CHART_COLORS.netProfit}
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </Box>

      <Divider />

      <Paper variant="outlined" sx={{ overflow: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: 'grey.100' }}>
              <TableCell>{t('month_col')}</TableCell>
              <TableCell align="right">{t('sales_row')} ({currency})</TableCell>
              <TableCell align="right">{t('cost_row')} ({currency})</TableCell>
              <TableCell align="right">{t('fixed_expenses_section')} ({currency})</TableCell>
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
            {quarterLayout
              ? quarterLayout.map(q => {
                  const agg = aggregateToQuarter(monthDataMap, q.months);
                  return (
                    <TableRow key={q.label}>
                      <TableCell>{buildQuarterLabel(q)}</TableCell>
                      <TableCell align="right">{Math.round(agg.monthlySales).toLocaleString()}</TableCell>
                      <TableCell align="right">{Math.round(agg.monthlyCost).toLocaleString()}</TableCell>
                      <TableCell align="right">{Math.round(agg.fixedTotal).toLocaleString()}</TableCell>
                      <TableCell align="right">{Math.round(agg.laborTotal ?? 0).toLocaleString()}</TableCell>
                      <TableCell align="right">{Math.round(agg.depreciation ?? 0).toLocaleString()}</TableCell>
                      <TableCell align="right">{Math.round(agg.totalExpense).toLocaleString()}</TableCell>
                      <TableCell
                        align="right"
                        sx={{ color: agg.operatingProfit >= 0 ? 'success.main' : 'error.main' }}
                      >
                        {Math.round(agg.operatingProfit).toLocaleString()}
                      </TableCell>
                      <TableCell align="right">{Math.round(agg.interestExpense).toLocaleString()}</TableCell>
                      <TableCell
                        align="right"
                        sx={{ color: agg.profitBeforeTax >= 0 ? 'success.main' : 'error.main' }}
                      >
                        {Math.round(agg.profitBeforeTax).toLocaleString()}
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{ color: agg.netProfit >= 0 ? 'success.main' : 'error.main' }}
                      >
                        {Math.round(agg.netProfit).toLocaleString()}
                      </TableCell>
                      <TableCell align="right">{`${agg.profitRate.toFixed(1)}%`}</TableCell>
                    </TableRow>
                  );
                })
              : months.map(row => {
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
                })
            }
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
