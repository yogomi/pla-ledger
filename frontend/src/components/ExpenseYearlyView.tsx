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
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useTranslation } from 'react-i18next';
import { useExpenseSimulationYearly } from '../hooks/useSalesSimulation';

interface ExpenseYearlyViewProps {
  projectId: string;
  /** 表示する年 (YYYY)。親コンポーネントで管理する。 */
  year: string;
  /** 通貨コード (例: JPY, USD)。金額表示に使用する。 */
  currency: string;
}

/**
 * Recharts の Tooltip formatter。
 * @param v - Tooltip が受け取る値（number | string | その他）
 * @returns 数値の場合は toLocaleString で整形した文字列、それ以外は String() 変換した文字列
 */
const tooltipFormatter = (v: unknown) =>
  typeof v === 'number' ? Math.round(v).toLocaleString() : String(v);

/**
 * 経費管理の年次表示コンポーネント。
 * 固定費・変動費・人件費のカテゴリー別年間集計表と月次推移グラフを表示する。
 */
export default function ExpenseYearlyView({ projectId, year, currency }: ExpenseYearlyViewProps) {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useExpenseSimulationYearly(projectId, year);

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

  const allMonths = data.monthlyTotals.map(mt => mt.yearMonth);

  /** 月次グラフ用データ（固定費・変動費・人件費） */
  const chartData = data.monthlyTotals.map(mt => ({
    name: mt.yearMonth.split('-')[1],
    [t('fixed_expenses_section')]: mt.fixedTotal,
    [t('variable_expenses_section')]: mt.variableTotal,
    [t('labor_cost_section')]: mt.laborTotal,
  }));

  /**
   * カテゴリー別月次表を描画する共通コンポーネント。
   * @param title - セクションタイトル
   * @param categories - カテゴリー別データ配列
   * @param totalRow - 合計行の表示ラベル
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
    const columnTotal = allMonths.map((ym) =>
      categories.reduce((sum, cat) => {
        const m = cat.months.find(mo => mo.yearMonth === ym);
        return sum + (m ? m.amount : 0);
      }, 0),
    );
    const grandTotal = categories.reduce((sum, cat) => sum + cat.yearlyTotal, 0);

    return (
      <Paper variant="outlined" sx={{ overflow: 'auto', mb: 3 }}>
        <Box p={2} borderBottom={1} borderColor="divider">
          <Typography variant="h6">{title}</Typography>
        </Box>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: 'grey.100' }}>
              <TableCell>{t('category_name_col')}</TableCell>
              {allMonths.map(ym => {
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
                {allMonths.map(ym => {
                  const m = cat.months.find(mo => mo.yearMonth === ym);
                  return (
                    <TableCell key={ym} align="right">
                      {Math.round(m ? m.amount : 0).toLocaleString()}
                    </TableCell>
                  );
                })}
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
                  <TableCell key={allMonths[i]} align="right">
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

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        {t('yearly_expense_summary')} ({t('year_label', { year })})
      </Typography>

      {/* 固定費カテゴリー別表 */}
      {renderCategoryTable(
        t('fixed_expenses_section'),
        data.fixedByCategory,
        t('fixed_total_row'),
      )}

      {/* 変動費カテゴリー別表 */}
      {renderCategoryTable(
        t('variable_expenses_section'),
        data.variableByCategory,
        t('variable_total_row'),
      )}

      {/* 人件費月次表 */}
      <Paper variant="outlined" sx={{ overflow: 'auto', mb: 3 }}>
        <Box p={2} borderBottom={1} borderColor="divider">
          <Typography variant="h6">{t('labor_cost_section')}</Typography>
        </Box>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: 'grey.100' }}>
              <TableCell>{t('category_name_col')}</TableCell>
              {allMonths.map(ym => {
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
            <TableRow>
              <TableCell>{t('labor_cost_section')}</TableCell>
              {data.laborMonths.map(lm => (
                <TableCell key={lm.yearMonth} align="right">
                  {Math.round(lm.amount).toLocaleString()}
                </TableCell>
              ))}
              <TableCell align="right">
                <Typography fontWeight="bold">
                  {Math.round(data.yearlyTotals.totalLabor).toLocaleString()}
                </Typography>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Paper>

      {/* 経費合計サマリー表 */}
      <Paper variant="outlined" sx={{ overflow: 'auto', mb: 3 }}>
        <Box p={2} borderBottom={1} borderColor="divider">
          <Typography variant="h6">{t('expense_total_row')}</Typography>
        </Box>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: 'grey.100' }}>
              <TableCell />
              {allMonths.map(ym => {
                const m = ym.split('-')[1];
                return (
                  <TableCell key={ym} align="right">
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
              {data.monthlyTotals.map(mt => (
                <TableCell key={mt.yearMonth} align="right">
                  {Math.round(mt.fixedTotal).toLocaleString()}
                </TableCell>
              ))}
              <TableCell align="right">
                <Typography fontWeight="bold">
                  {Math.round(data.yearlyTotals.totalFixed).toLocaleString()}
                </Typography>
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>{t('variable_total_row')}</TableCell>
              {data.monthlyTotals.map(mt => (
                <TableCell key={mt.yearMonth} align="right">
                  {Math.round(mt.variableTotal).toLocaleString()}
                </TableCell>
              ))}
              <TableCell align="right">
                <Typography fontWeight="bold">
                  {Math.round(data.yearlyTotals.totalVariable).toLocaleString()}
                </Typography>
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>{t('labor_total_row')}</TableCell>
              {data.monthlyTotals.map(mt => (
                <TableCell key={mt.yearMonth} align="right">
                  {Math.round(mt.laborTotal).toLocaleString()}
                </TableCell>
              ))}
              <TableCell align="right">
                <Typography fontWeight="bold">
                  {Math.round(data.yearlyTotals.totalLabor).toLocaleString()}
                </Typography>
              </TableCell>
            </TableRow>
            <TableRow sx={{ backgroundColor: 'grey.50' }}>
              <TableCell>
                <Typography fontWeight="bold">{t('expense_total_row')}</Typography>
              </TableCell>
              {data.monthlyTotals.map(mt => (
                <TableCell key={mt.yearMonth} align="right">
                  <Typography fontWeight="bold">{Math.round(mt.totalExpense).toLocaleString()}</Typography>
                </TableCell>
              ))}
              <TableCell align="right">
                <Typography fontWeight="bold">
                  {Math.round(data.yearlyTotals.totalExpense).toLocaleString()}
                </Typography>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Paper>

      <Divider sx={{ my: 2 }} />

      {/* 月次経費推移グラフ */}
      <Typography variant="h6" gutterBottom>
        {t('expense_yearly_chart_title')} ({currency})
      </Typography>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis tickFormatter={v => Number(v).toLocaleString()} />
          <Tooltip formatter={tooltipFormatter} />
          <Legend />
          <Bar
            dataKey={t('fixed_expenses_section')}
            stackId="expense"
            fill="#f44336"
          />
          <Bar
            dataKey={t('variable_expenses_section')}
            stackId="expense"
            fill="#ff9800"
          />
          <Bar
            dataKey={t('labor_cost_section')}
            stackId="expense"
            fill="#2196f3"
          />
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
}
