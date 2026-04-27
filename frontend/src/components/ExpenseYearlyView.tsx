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
import { useQueries } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getExpenseSimulationYearly } from '../api/salesSimulations';
import { QuarterDef, buildQuarterLabel } from '../utils/quarterUtils';
import { ExpenseMonthlyTotal } from '../types/SalesSimulation';

interface ExpenseYearlyViewProps {
  projectId: string;
  /** 表示する年 (YYYY)。親コンポーネントで管理する。 */
  year: string;
  /** 通貨コード (例: JPY, USD)。金額表示に使用する。 */
  currency: string;
  /** 四半期レイアウト。null の場合は月次表示。 */
  quarterLayout?: QuarterDef[] | null;
  /** 表示対象の12ヶ月 (YYYY-MM)。事業年度モード時に開業月始まりで渡される。 */
  displayMonths?: string[] | null;
}

const tooltipFormatter = (v: unknown) =>
  typeof v === 'number' ? Math.round(v).toLocaleString() : String(v);

/**
 * 経費管理の年次表示コンポーネント。
 * 固定費・人件費のカテゴリー別年間集計表と月次推移グラフを表示する。
 * displayMonths が指定された場合は事業年度順（開業月始まり）で表示し、
 * 2暦年にまたがる場合は両年のデータをフェッチして結合する。
 */
export default function ExpenseYearlyView({
  projectId,
  year,
  currency,
  quarterLayout = null,
  displayMonths = null,
}: ExpenseYearlyViewProps) {
  const { t } = useTranslation();

  const calendarYears = displayMonths
    ? [...new Set(displayMonths.map(ym => ym.split('-')[0]))]
    : [year];

  const queryResults = useQueries({
    queries: calendarYears.map(y => ({
      queryKey: ['expenseSimulationYearly', projectId, y] as const,
      queryFn: () => getExpenseSimulationYearly(projectId, y),
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

  // 全暦年の月次合計データをマップで結合
  const monthlyTotalsMap = new Map<string, ExpenseMonthlyTotal>();
  queryResults.forEach(r => {
    r.data!.monthlyTotals.forEach(mt => monthlyTotalsMap.set(mt.yearMonth, mt));
  });

  // 表示順の月リスト
  const displayOrderMonths: string[] = displayMonths
    ?? queryResults[0]!.data!.monthlyTotals.map(mt => mt.yearMonth);

  // 固定費カテゴリーを全暦年から結合（categoryName でマージ）
  const fixedCatAmounts = new Map<string, Map<string, number>>();
  queryResults.forEach(r => {
    r.data!.fixedByCategory.forEach(cat => {
      if (!fixedCatAmounts.has(cat.categoryName)) {
        fixedCatAmounts.set(cat.categoryName, new Map());
      }
      cat.months.forEach(m => fixedCatAmounts.get(cat.categoryName)!.set(m.yearMonth, m.amount));
    });
  });
  const fixedByCategory = Array.from(fixedCatAmounts.entries()).map(([categoryName, amountMap]) => ({
    categoryName,
    months: displayOrderMonths.map(ym => ({ yearMonth: ym, amount: amountMap.get(ym) ?? 0 })),
    yearlyTotal: displayOrderMonths.reduce((s, ym) => s + (amountMap.get(ym) ?? 0), 0),
  }));

  // 人件費 type を全暦年から結合
  const laborTypeAmounts = new Map<string, Map<string, number>>();
  queryResults.forEach(r => {
    r.data!.laborByType.forEach(lt => {
      if (!laborTypeAmounts.has(lt.categoryName)) {
        laborTypeAmounts.set(lt.categoryName, new Map());
      }
      lt.months.forEach(m => laborTypeAmounts.get(lt.categoryName)!.set(m.yearMonth, m.amount));
    });
  });
  const laborByType = Array.from(laborTypeAmounts.entries()).map(([categoryName, amountMap]) => ({
    categoryName,
    months: displayOrderMonths.map(ym => ({ yearMonth: ym, amount: amountMap.get(ym) ?? 0 })),
    yearlyTotal: displayOrderMonths.reduce((s, ym) => s + (amountMap.get(ym) ?? 0), 0),
  }));

  // 月次合計リスト（表示順）
  const monthlyTotals: ExpenseMonthlyTotal[] = displayOrderMonths.map(ym =>
    monthlyTotalsMap.get(ym) ?? { yearMonth: ym, fixedTotal: 0, laborTotal: 0, totalExpense: 0 },
  );

  // 年間合計を表示対象月から計算
  const yearlyTotals = {
    totalFixed: monthlyTotals.reduce((s, mt) => s + mt.fixedTotal, 0),
    totalLabor: monthlyTotals.reduce((s, mt) => s + mt.laborTotal, 0),
    totalExpense: monthlyTotals.reduce((s, mt) => s + mt.totalExpense, 0),
  };

  const chartData = monthlyTotals.map(mt => ({
    name: mt.yearMonth.split('-')[1],
    [t('fixed_expenses_section')]: mt.fixedTotal,
    [t('labor_cost_section')]: mt.laborTotal,
  }));

  // 指定 yearMonth グループの amount 合計を返す
  const sumAmount = (
    months: Array<{ yearMonth: string; amount: number }>,
    yms: string[],
  ) => yms.reduce((s, ym) => {
    const m = months.find(mo => mo.yearMonth === ym);
    return s + (m?.amount ?? 0);
  }, 0);

  /**
   * カテゴリー別月次 or 四半期表を描画する共通コンポーネント。
   */
  const renderCategoryTable = (
    title: string,
    categories: Array<{
      categoryName: string;
      months: Array<{ yearMonth: string; amount: number }>;
      yearlyTotal: number;
    }>,
    totalRow?: string,
  ) => {
    const grandTotal = categories.reduce((sum, cat) => sum + cat.yearlyTotal, 0);

    if (quarterLayout) {
      // 四半期表示
      const colTotals = quarterLayout.map(q =>
        categories.reduce((s, cat) => s + sumAmount(cat.months, q.months), 0),
      );
      return (
        <Paper variant="outlined" sx={{ overflow: 'auto', mb: 3 }}>
          <Box p={2} borderBottom={1} borderColor="divider">
            <Typography variant="h6">{title}</Typography>
          </Box>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: 'grey.100' }}>
                <TableCell>{t('category_name_col')}</TableCell>
                {quarterLayout.map(q => (
                  <TableCell key={q.label} align="right">{buildQuarterLabel(q)}</TableCell>
                ))}
                <TableCell align="right">{t('category_total')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {categories.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography variant="body2" color="text.secondary">{t('no_items')}</Typography>
                  </TableCell>
                </TableRow>
              )}
              {categories.map(cat => (
                <TableRow key={cat.categoryName}>
                  <TableCell>{cat.categoryName}</TableCell>
                  {quarterLayout.map(q => (
                    <TableCell key={q.label} align="right">
                      {Math.round(sumAmount(cat.months, q.months)).toLocaleString()}
                    </TableCell>
                  ))}
                  <TableCell align="right">
                    <Typography fontWeight="bold">{Math.round(cat.yearlyTotal).toLocaleString()}</Typography>
                  </TableCell>
                </TableRow>
              ))}
              {totalRow !== undefined && (
                <TableRow sx={{ backgroundColor: 'grey.50' }}>
                  <TableCell>
                    <Typography fontWeight="bold">{totalRow}</Typography>
                  </TableCell>
                  {colTotals.map((v, i) => (
                    <TableCell key={quarterLayout[i].label} align="right">
                      <Typography fontWeight="bold">{Math.round(v).toLocaleString()}</Typography>
                    </TableCell>
                  ))}
                  <TableCell align="right">
                    <Typography fontWeight="bold">{Math.round(grandTotal).toLocaleString()}</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Paper>
      );
    }

    // 月次表示
    const columnTotal = displayOrderMonths.map(ym =>
      categories.reduce((sum, cat) => {
        const m = cat.months.find(mo => mo.yearMonth === ym);
        return sum + (m ? m.amount : 0);
      }, 0),
    );

    return (
      <Paper variant="outlined" sx={{ overflow: 'auto', mb: 3 }}>
        <Box p={2} borderBottom={1} borderColor="divider">
          <Typography variant="h6">{title}</Typography>
        </Box>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: 'grey.100' }}>
              <TableCell>{t('category_name_col')}</TableCell>
              {displayOrderMonths.map(ym => {
                const m = ym.split('-')[1];
                return (
                  <TableCell key={ym} align="right">
                    {t('month_label_short', { month: Number(m) })}
                  </TableCell>
                );
              })}
              <TableCell align="right">{t('category_total')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {categories.length === 0 && (
              <TableRow>
                <TableCell colSpan={14} align="center">
                  <Typography variant="body2" color="text.secondary">{t('no_items')}</Typography>
                </TableCell>
              </TableRow>
            )}
            {categories.map(cat => (
              <TableRow key={cat.categoryName}>
                <TableCell>{cat.categoryName}</TableCell>
                {cat.months.map(m => (
                  <TableCell key={m.yearMonth} align="right">
                    {Math.round(m.amount).toLocaleString()}
                  </TableCell>
                ))}
                <TableCell align="right">
                  <Typography fontWeight="bold">{Math.round(cat.yearlyTotal).toLocaleString()}</Typography>
                </TableCell>
              </TableRow>
            ))}
            {totalRow !== undefined && (
              <TableRow sx={{ backgroundColor: 'grey.50' }}>
                <TableCell>
                  <Typography fontWeight="bold">{totalRow}</Typography>
                </TableCell>
                {columnTotal.map((v, i) => (
                  <TableCell key={displayOrderMonths[i]} align="right">
                    <Typography fontWeight="bold">{Math.round(v).toLocaleString()}</Typography>
                  </TableCell>
                ))}
                <TableCell align="right">
                  <Typography fontWeight="bold">{Math.round(grandTotal).toLocaleString()}</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
    );
  };

  // 経費合計サマリー表
  const renderTotalTable = () => {
    if (quarterLayout) {
      return (
        <Paper variant="outlined" sx={{ overflow: 'auto', mb: 3 }}>
          <Box p={2} borderBottom={1} borderColor="divider">
            <Typography variant="h6">{t('expense_total_row')}</Typography>
          </Box>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: 'grey.100' }}>
                <TableCell />
                {quarterLayout.map(q => (
                  <TableCell key={q.label} align="right">{buildQuarterLabel(q)}</TableCell>
                ))}
                <TableCell align="right">{t('yearly_total')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell>{t('fixed_total_row')}</TableCell>
                {quarterLayout.map(q => (
                  <TableCell key={q.label} align="right">
                    {Math.round(q.months.reduce((s, ym) => {
                      return s + (monthlyTotalsMap.get(ym)?.fixedTotal ?? 0);
                    }, 0)).toLocaleString()}
                  </TableCell>
                ))}
                <TableCell align="right">
                  <Typography fontWeight="bold">
                    {Math.round(yearlyTotals.totalFixed).toLocaleString()}
                  </Typography>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>{t('labor_total_row')}</TableCell>
                {quarterLayout.map(q => (
                  <TableCell key={q.label} align="right">
                    {Math.round(q.months.reduce((s, ym) => {
                      return s + (monthlyTotalsMap.get(ym)?.laborTotal ?? 0);
                    }, 0)).toLocaleString()}
                  </TableCell>
                ))}
                <TableCell align="right">
                  <Typography fontWeight="bold">
                    {Math.round(yearlyTotals.totalLabor).toLocaleString()}
                  </Typography>
                </TableCell>
              </TableRow>
              <TableRow sx={{ backgroundColor: 'grey.50' }}>
                <TableCell>
                  <Typography fontWeight="bold">{t('expense_total_row')}</Typography>
                </TableCell>
                {quarterLayout.map(q => (
                  <TableCell key={q.label} align="right">
                    <Typography fontWeight="bold">
                      {Math.round(q.months.reduce((s, ym) => {
                        return s + (monthlyTotalsMap.get(ym)?.totalExpense ?? 0);
                      }, 0)).toLocaleString()}
                    </Typography>
                  </TableCell>
                ))}
                <TableCell align="right">
                  <Typography fontWeight="bold">
                    {Math.round(yearlyTotals.totalExpense).toLocaleString()}
                  </Typography>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Paper>
      );
    }

    return (
      <Paper variant="outlined" sx={{ overflow: 'auto', mb: 3 }}>
        <Box p={2} borderBottom={1} borderColor="divider">
          <Typography variant="h6">{t('expense_total_row')}</Typography>
        </Box>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: 'grey.100' }}>
              <TableCell />
              {monthlyTotals.map(mt => {
                const m = mt.yearMonth.split('-')[1];
                return (
                  <TableCell key={mt.yearMonth} align="right">
                    {t('month_label_short', { month: Number(m) })}
                  </TableCell>
                );
              })}
              <TableCell align="right">{t('yearly_total')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell>{t('fixed_total_row')}</TableCell>
              {monthlyTotals.map(mt => (
                <TableCell key={mt.yearMonth} align="right">
                  {Math.round(mt.fixedTotal).toLocaleString()}
                </TableCell>
              ))}
              <TableCell align="right">
                <Typography fontWeight="bold">
                  {Math.round(yearlyTotals.totalFixed).toLocaleString()}
                </Typography>
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>{t('labor_total_row')}</TableCell>
              {monthlyTotals.map(mt => (
                <TableCell key={mt.yearMonth} align="right">
                  {Math.round(mt.laborTotal).toLocaleString()}
                </TableCell>
              ))}
              <TableCell align="right">
                <Typography fontWeight="bold">
                  {Math.round(yearlyTotals.totalLabor).toLocaleString()}
                </Typography>
              </TableCell>
            </TableRow>
            <TableRow sx={{ backgroundColor: 'grey.50' }}>
              <TableCell>
                <Typography fontWeight="bold">{t('expense_total_row')}</Typography>
              </TableCell>
              {monthlyTotals.map(mt => (
                <TableCell key={mt.yearMonth} align="right">
                  <Typography fontWeight="bold">{Math.round(mt.totalExpense).toLocaleString()}</Typography>
                </TableCell>
              ))}
              <TableCell align="right">
                <Typography fontWeight="bold">
                  {Math.round(yearlyTotals.totalExpense).toLocaleString()}
                </Typography>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Paper>
    );
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        {t('yearly_expense_summary')} ({t('year_label', { year })})
      </Typography>

      {/* 月次経費推移グラフ（グラフは常に月次表示） */}
      <Typography variant="h6" gutterBottom>
        {t('expense_yearly_chart_title')} ({currency})
      </Typography>
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis tickFormatter={v => Number(v).toLocaleString()} />
          <Tooltip formatter={tooltipFormatter} />
          <Legend />
          <Line
            type="monotone"
            dataKey={t('fixed_expenses_section')}
            stroke="#f44336"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey={t('labor_cost_section')}
            stroke="#2196f3"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>

      <Divider sx={{ my: 2 }} />

      {/* 固定費カテゴリー別表 */}
      {renderCategoryTable(
        t('fixed_expenses_section'),
        fixedByCategory,
        t('fixed_total_row'),
      )}

      {/* 人件費 type 別表 */}
      {renderCategoryTable(
        t('labor_cost_section'),
        laborByType.map(lt => ({
          ...lt,
          categoryName: t(lt.categoryName as Parameters<typeof t>[0]),
        })),
        t('labor_total_row'),
      )}

      {/* 経費合計サマリー表 */}
      {renderTotalTable()}
    </Box>
  );
}
