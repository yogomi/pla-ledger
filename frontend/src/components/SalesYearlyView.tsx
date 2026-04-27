import React from 'react';
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
import { getSalesSimulationYearly, getSalesSimulationYearlyItems } from '../api/salesSimulations';
import ChartTooltip from './ChartTooltip';
import { QuarterDef, buildQuarterLabel } from '../utils/quarterUtils';

interface SalesYearlyViewProps {
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

/** グラフのカラーパレット */
const CHART_COLORS = [
  '#4caf50', '#2196f3', '#ff9800', '#f44336', '#9c27b0',
  '#00bcd4', '#ffeb3b', '#795548', '#607d8b', '#e91e63',
];

/**
 * 売上シミュレーションの年次表示コンポーネント。
 * カテゴリー別の年間売上集計表と月次売上推移グラフを表示する。
 * displayMonths が指定された場合は事業年度順（開業月始まり）で表示し、
 * 2暦年にまたがる場合は両年のデータをフェッチして結合する。
 */
export default function SalesYearlyView({
  projectId,
  year,
  currency,
  quarterLayout = null,
  displayMonths = null,
}: SalesYearlyViewProps) {
  const { t } = useTranslation();

  const calendarYears = displayMonths
    ? [...new Set(displayMonths.map(ym => ym.split('-')[0]))]
    : [year];

  // カテゴリー別売上データ（複数暦年分）
  const categoryResults = useQueries({
    queries: calendarYears.map(y => ({
      queryKey: ['salesSimulationYearly', projectId, y] as const,
      queryFn: () => getSalesSimulationYearly(projectId, y),
      enabled: Boolean(projectId) && Boolean(y),
    })),
  });

  // 品目別売上データ（複数暦年分）
  const itemResults = useQueries({
    queries: calendarYears.map(y => ({
      queryKey: ['salesSimulationYearlyItems', projectId, y] as const,
      queryFn: () => getSalesSimulationYearlyItems(projectId, y),
      enabled: Boolean(projectId) && Boolean(y),
    })),
  });

  if (categoryResults.some(r => r.isLoading)) {
    return (
      <Box display="flex" justifyContent="center" mt={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (categoryResults.some(r => r.isError || !r.data)) {
    return <Alert severity="error">{t('load_error')}</Alert>;
  }

  // 表示順の月リスト
  const displayOrderMonths: string[] = displayMonths
    ?? categoryResults[0]!.data!.monthlyTotals.map(mt => mt.yearMonth);

  // 月次合計マップ（全暦年分を結合）
  const monthlyTotalsMap = new Map<string, { totalSales: number; totalCost: number; noteJa: string | null; noteEn: string | null }>();
  categoryResults.forEach(r => {
    r.data!.monthlyTotals.forEach(mt => monthlyTotalsMap.set(mt.yearMonth, mt));
  });

  // カテゴリーデータを全暦年から結合（categoryName でマージ）
  const catSalesMap = new Map<string, {
    categoryName: string;
    monthAmounts: Map<string, { monthlySales: number; monthlyCost: number }>;
  }>();
  categoryResults.forEach(r => {
    r.data!.categories.forEach(cat => {
      if (!catSalesMap.has(cat.categoryName)) {
        catSalesMap.set(cat.categoryName, {
          categoryName: cat.categoryName,
          monthAmounts: new Map(),
        });
      }
      const entry = catSalesMap.get(cat.categoryName)!;
      cat.months.forEach(m => entry.monthAmounts.set(m.yearMonth, {
        monthlySales: m.monthlySales,
        monthlyCost: m.monthlyCost,
      }));
    });
  });

  const categories = Array.from(catSalesMap.values()).map(cat => ({
    categoryName: cat.categoryName,
    months: displayOrderMonths.map(ym => ({
      yearMonth: ym,
      monthlySales: cat.monthAmounts.get(ym)?.monthlySales ?? 0,
      monthlyCost: cat.monthAmounts.get(ym)?.monthlyCost ?? 0,
    })),
    yearlyTotal: displayOrderMonths.reduce((s, ym) => s + (cat.monthAmounts.get(ym)?.monthlySales ?? 0), 0),
    yearlyCost: displayOrderMonths.reduce((s, ym) => s + (cat.monthAmounts.get(ym)?.monthlyCost ?? 0), 0),
  }));

  // 月次合計リスト（表示順）
  const monthlyTotals = displayOrderMonths.map(ym => ({
    yearMonth: ym,
    totalSales: monthlyTotalsMap.get(ym)?.totalSales ?? 0,
    totalCost: monthlyTotalsMap.get(ym)?.totalCost ?? 0,
    noteJa: monthlyTotalsMap.get(ym)?.noteJa ?? null,
    noteEn: monthlyTotalsMap.get(ym)?.noteEn ?? null,
  }));

  // 表示期間の年間合計
  const yearlyTotal = displayOrderMonths.reduce(
    (s, ym) => s + (monthlyTotalsMap.get(ym)?.totalSales ?? 0), 0,
  );

  // グラフも表示順（displayMonths がある場合は開業月始まり）で描画する
  const chartData = displayOrderMonths.map(ym => {
    const month = ym.split('-')[1];
    const mt = monthlyTotalsMap.get(ym);
    const entry: Record<string, number | string | null> = {
      name: month,
      noteJa: mt?.noteJa ?? null,
      noteEn: mt?.noteEn ?? null,
    };
    categories.forEach(cat => {
      const m = cat.months.find(mo => mo.yearMonth === ym);
      entry[cat.categoryName] = m?.monthlySales ?? 0;
    });
    return entry;
  });

  // 品目別データを全暦年から結合（categoryName + itemName でマージ）
  const catItemsMap = new Map<string, {
    categoryName: string;
    items: Map<string, {
      itemName: string;
      monthAmounts: Map<string, { monthlySales: number; monthlyCost: number }>;
    }>;
  }>();
  itemResults.forEach(r => {
    if (!r.data) return;
    r.data.categories.forEach(cat => {
      if (!catItemsMap.has(cat.categoryName)) {
        catItemsMap.set(cat.categoryName, {
          categoryName: cat.categoryName,
          items: new Map(),
        });
      }
      const catEntry = catItemsMap.get(cat.categoryName)!;
      cat.items.forEach(item => {
        if (!catEntry.items.has(item.itemName)) {
          catEntry.items.set(item.itemName, {
            itemName: item.itemName,
            monthAmounts: new Map(),
          });
        }
        const itemEntry = catEntry.items.get(item.itemName)!;
        item.months.forEach(m => itemEntry.monthAmounts.set(m.yearMonth, {
          monthlySales: m.monthlySales,
          monthlyCost: m.monthlyCost,
        }));
      });
    });
  });

  const itemsCategories = Array.from(catItemsMap.values()).map(cat => ({
    categoryName: cat.categoryName,
    items: Array.from(cat.items.values()).map(item => ({
      itemName: item.itemName,
      months: displayOrderMonths.map(ym => ({
        yearMonth: ym,
        monthlySales: item.monthAmounts.get(ym)?.monthlySales ?? 0,
        monthlyCost: item.monthAmounts.get(ym)?.monthlyCost ?? 0,
      })),
      yearlyTotal: displayOrderMonths.reduce(
        (s, ym) => s + (item.monthAmounts.get(ym)?.monthlySales ?? 0), 0,
      ),
      yearlyCost: displayOrderMonths.reduce(
        (s, ym) => s + (item.monthAmounts.get(ym)?.monthlyCost ?? 0), 0,
      ),
    })),
    categoryYearlyTotal: Array.from(cat.items.values()).reduce((s, item) => {
      return s + displayOrderMonths.reduce(
        (s2, ym) => s2 + (item.monthAmounts.get(ym)?.monthlySales ?? 0), 0,
      );
    }, 0),
  }));

  // カテゴリテーブルのカラム定義（月次 or 四半期）
  const colHeaders = quarterLayout
    ? quarterLayout.map(q => ({ key: q.label, label: buildQuarterLabel(q) }))
    : monthlyTotals.map(mt => {
        const m = mt.yearMonth.split('-')[1];
        return { key: mt.yearMonth, label: t('month_label_short', { month: Number(m) }) };
      });

  // 指定された yearMonth グループの売上合計を返す
  const sumSales = (monthData: { yearMonth: string; monthlySales: number }[], yms: string[]) =>
    yms.reduce((s, ym) => {
      const m = monthData.find(md => md.yearMonth === ym);
      return s + (m?.monthlySales ?? 0);
    }, 0);

  // monthlyTotals の指定 yearMonth グループの売上合計を返す
  const sumTotals = (yms: string[]) =>
    yms.reduce((s, ym) => {
      const mt = monthlyTotalsMap.get(ym);
      return s + (mt?.totalSales ?? 0);
    }, 0);

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        {t('yearly_sales_by_category')} ({t('year_label', { year })})
      </Typography>

      {/* 月次売上推移グラフ（グラフは常に月次表示） */}
      <Typography variant="h6" gutterBottom>
        {t('sales_yearly_chart_title')} ({currency})
      </Typography>
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis tickFormatter={v => Number(v).toLocaleString()} />
          <Tooltip content={props => <ChartTooltip {...props} />} />
          <Legend />
          {categories.map((cat, idx) => (
            <Line
              key={cat.categoryName}
              type="monotone"
              dataKey={cat.categoryName}
              stroke={CHART_COLORS[idx % CHART_COLORS.length]}
              dot={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>

      <Divider sx={{ my: 2 }} />

      {/* カテゴリー別年間売上表 */}
      <Paper variant="outlined" sx={{ overflow: 'auto', mb: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: 'grey.100' }}>
              <TableCell>{t('category_name_col')}</TableCell>
              {colHeaders.map(col => (
                <TableCell key={col.key} align="right">{col.label}</TableCell>
              ))}
              <TableCell align="right">{t('category_total')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {categories.map(cat => (
              <TableRow key={cat.categoryName}>
                <TableCell>{cat.categoryName}</TableCell>
                {quarterLayout
                  ? quarterLayout.map(q => (
                      <TableCell key={q.label} align="right">
                        {Math.round(sumSales(cat.months, q.months)).toLocaleString()}
                      </TableCell>
                    ))
                  : cat.months.map(m => (
                      <TableCell key={m.yearMonth} align="right">
                        {Math.round(m.monthlySales).toLocaleString()}
                      </TableCell>
                    ))
                }
                <TableCell align="right">
                  <Typography fontWeight="bold">
                    {Math.round(cat.yearlyTotal).toLocaleString()}
                  </Typography>
                </TableCell>
              </TableRow>
            ))}
            {/* 合計行 */}
            <TableRow sx={{ backgroundColor: 'grey.50' }}>
              <TableCell>
                <Typography fontWeight="bold">{t('yearly_total')}</Typography>
              </TableCell>
              {quarterLayout
                ? quarterLayout.map(q => (
                    <TableCell key={q.label} align="right">
                      <Typography fontWeight="bold">
                        {Math.round(sumTotals(q.months)).toLocaleString()}
                      </Typography>
                    </TableCell>
                  ))
                : monthlyTotals.map(mt => (
                    <TableCell key={mt.yearMonth} align="right">
                      <Typography fontWeight="bold">
                        {Math.round(mt.totalSales).toLocaleString()}
                      </Typography>
                    </TableCell>
                  ))
              }
              <TableCell align="right">
                <Typography fontWeight="bold">
                  {Math.round(yearlyTotal).toLocaleString()}
                </Typography>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Paper>

      {/* 品目別詳細テーブル */}
      {itemsCategories.length > 0 && (
        <>
          <Divider sx={{ my: 2 }} />
          <Typography variant="h6" gutterBottom>
            {t('sales_detail_by_item')} ({currency})
          </Typography>
          <Paper variant="outlined" sx={{ overflow: 'auto', mb: 3 }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: 'grey.100' }}>
                  <TableCell sx={{ minWidth: 100 }}>{t('category_name_col')}</TableCell>
                  <TableCell sx={{ minWidth: 120 }}>{t('item_name')}</TableCell>
                  {quarterLayout
                    ? quarterLayout.map(q => (
                        <TableCell key={q.label} align="right" sx={{ minWidth: 72 }}>
                          {buildQuarterLabel(q)}
                        </TableCell>
                      ))
                    : monthlyTotals.map(mt => {
                        const m = mt.yearMonth.split('-')[1];
                        return (
                          <TableCell key={mt.yearMonth} align="right" sx={{ minWidth: 72 }}>
                            {t('month_label_short', { month: Number(m) })}
                          </TableCell>
                        );
                      })
                  }
                  <TableCell align="right" sx={{ minWidth: 90 }}>{t('category_total')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {itemsCategories.map(cat => (
                  <React.Fragment key={cat.categoryName}>
                    {cat.items.map(item => (
                      <TableRow key={item.itemName}>
                        <TableCell>{cat.categoryName}</TableCell>
                        <TableCell>{item.itemName}</TableCell>
                        {quarterLayout
                          ? quarterLayout.map(q => {
                              const total = q.months.reduce((s, ym) => {
                                const mo = item.months.find(m => m.yearMonth === ym);
                                return s + (mo?.monthlySales ?? 0);
                              }, 0);
                              return (
                                <TableCell key={q.label} align="right">
                                  {Math.round(total).toLocaleString()}
                                </TableCell>
                              );
                            })
                          : item.months.map(m => (
                              <TableCell key={m.yearMonth} align="right">
                                {Math.round(m.monthlySales).toLocaleString()}
                              </TableCell>
                            ))
                        }
                        <TableCell align="right">
                          <Typography fontWeight="bold">
                            {Math.round(item.yearlyTotal).toLocaleString()}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                    {/* カテゴリ小計行 */}
                    <TableRow sx={{ backgroundColor: 'grey.50' }}>
                      <TableCell colSpan={2}>
                        <Typography variant="body2" fontWeight="bold">
                          {cat.categoryName} {t('subtotal')}
                        </Typography>
                      </TableCell>
                      {quarterLayout
                        ? quarterLayout.map(q => {
                            const total = cat.items.reduce((s, item) =>
                              s + q.months.reduce((s2, ym) => {
                                const mo = item.months.find(m => m.yearMonth === ym);
                                return s2 + (mo?.monthlySales ?? 0);
                              }, 0), 0);
                            return (
                              <TableCell key={q.label} align="right">
                                <Typography variant="body2" fontWeight="bold">
                                  {Math.round(total).toLocaleString()}
                                </Typography>
                              </TableCell>
                            );
                          })
                        : monthlyTotals.map((mt, idx) => {
                            const monthTotal = cat.items.reduce(
                              (s, item) => s + (item.months[idx]?.monthlySales ?? 0), 0,
                            );
                            return (
                              <TableCell key={mt.yearMonth} align="right">
                                <Typography variant="body2" fontWeight="bold">
                                  {Math.round(monthTotal).toLocaleString()}
                                </Typography>
                              </TableCell>
                            );
                          })
                      }
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight="bold">
                          {Math.round(cat.categoryYearlyTotal).toLocaleString()}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </>
      )}
    </Box>
  );
}
