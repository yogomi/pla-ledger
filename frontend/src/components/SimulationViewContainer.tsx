import React, { useState } from 'react';
import {
  Alert,
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  CircularProgress,
  Divider,
  Paper,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useTranslation } from 'react-i18next';
import { useSalesSimulationMonthly, useExpenseSimulationMonthly } from '../hooks/useSalesSimulation';
import ProfitLossYearlyTable from './ProfitLossYearlyTable';
import SalesSimulationPagination from './SalesSimulationPagination';
import LoanListContainer from './LoanListContainer';
import CashFlowMonthlyView from './CashFlowMonthlyView';
import CashFlowCharts from './CashFlowCharts';
import CashFlowYearlyTable from './CashFlowYearlyTable';
import SalesYearlyView from './SalesYearlyView';
import ExpenseYearlyView from './ExpenseYearlyView';
import LoanYearlyView from './LoanYearlyView';
import SalesLongtermView from './SalesLongtermView';
import ExpenseLongtermView from './ExpenseLongtermView';
import LoanLongtermView from './LoanLongtermView';
import CashFlowLongtermTable from './CashFlowLongtermTable';
import ProfitLossLongtermTable from './ProfitLossLongtermTable';

interface SimulationViewContainerProps {
  projectId: string;
  /** 表示する年月 (YYYY-MM)。親コンポーネントで管理する。 */
  yearMonth: string;
  /** 年月変更時のコールバック。親コンポーネントに伝播する。 */
  onYearMonthChange: (ym: string) => void;
  /** 通貨コード (例: JPY, USD)。金額表示に使用する。 */
  currency: string;
  /** 編集権限の有無。借入管理タブで利用する。 */
  canEdit?: boolean;
}

/** 月次売上データの読み取り専用表示 */
function SalesSimulationMonthlyView({
  projectId,
  yearMonth,
}: {
  projectId: string;
  yearMonth: string;
}) {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useSalesSimulationMonthly(projectId, yearMonth);

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

  return (
    <Box>
      {data.isInherited && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {t('inherited_info_sales')}
        </Alert>
      )}

      {data.categories.map(cat => (
        <Accordion key={cat.categoryId} defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography fontWeight="bold">{cat.categoryName}</Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ p: 0 }}>
            <Paper variant="outlined" square>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ backgroundColor: 'grey.100' }}>
                    <TableCell>{t('item_name')}</TableCell>
                    <TableCell align="right">{t('unit_price')}</TableCell>
                    <TableCell align="right">{t('quantity')}</TableCell>
                    <TableCell align="right">{t('operating_days')}</TableCell>
                    <TableCell align="right">{t('cost_rate')}</TableCell>
                    <TableCell align="right">{t('monthly_sales_col')}</TableCell>
                    <TableCell align="right">{t('monthly_cost_col')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {cat.items.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        <Typography variant="body2" color="text.secondary">
                          {t('no_items')}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                  {cat.items.map(item => (
                    <TableRow key={item.itemId}>
                      <TableCell>{item.itemName}</TableCell>
                      <TableCell align="right">{item.unitPrice.toLocaleString()}</TableCell>
                      <TableCell align="right">{item.quantity.toLocaleString()}</TableCell>
                      <TableCell align="right">{item.operatingDays.toLocaleString()}</TableCell>
                      <TableCell align="right">{item.costRate.toFixed(1)}</TableCell>
                      <TableCell align="right">{item.monthlySales.toLocaleString()}</TableCell>
                      <TableCell align="right">{item.monthlyCost.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          </AccordionDetails>
        </Accordion>
      ))}

      <Paper variant="outlined" sx={{ mt: 2, p: 2 }}>
        <Typography variant="body2" color="text.secondary">
          {t('monthly_sales_total', { amount: data.monthlyTotal.toLocaleString() })}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t('monthly_cost_total', { amount: data.monthlyCost.toLocaleString() })}
        </Typography>
      </Paper>
    </Box>
  );
}

/** 月次経費データの読み取り専用表示 */
function ExpenseMonthlyView({
  projectId,
  yearMonth,
  currency,
}: {
  projectId: string;
  yearMonth: string;
  currency: string;
}) {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useExpenseSimulationMonthly(projectId, yearMonth);

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

  return (
    <Box display="flex" flexDirection="column" gap={3}>
      {data.isInherited && (
        <Alert severity="info">
          {t('inherited_info_expense')}
        </Alert>
      )}

      {/* 固定費 */}
      <Paper variant="outlined">
        <Box p={2} borderBottom={1} borderColor="divider">
          <Typography variant="h6">{t('fixed_expenses_section')}</Typography>
        </Box>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: 'grey.100' }}>
              <TableCell>{t('category_name_col')}</TableCell>
              <TableCell align="right">{t('monthly_amount')}</TableCell>
              <TableCell>{t('notes')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.fixedExpenses.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} align="center">
                  <Typography variant="body2" color="text.secondary">{t('no_items')}</Typography>
                </TableCell>
              </TableRow>
            )}
            {data.fixedExpenses.map(e => (
              <TableRow key={e.id}>
                <TableCell>{e.categoryName}</TableCell>
                <TableCell align="right">{e.amount.toLocaleString()}</TableCell>
                <TableCell>{e.description ?? ''}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      {/* 変動費 */}
      <Paper variant="outlined">
        <Box p={2} borderBottom={1} borderColor="divider">
          <Typography variant="h6">{t('variable_expenses_section')}</Typography>
        </Box>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: 'grey.100' }}>
              <TableCell>{t('category_name_col')}</TableCell>
              <TableCell align="right">{t('monthly_amount')}</TableCell>
              <TableCell>{t('notes')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.variableExpenses.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} align="center">
                  <Typography variant="body2" color="text.secondary">{t('no_items')}</Typography>
                </TableCell>
              </TableRow>
            )}
            {data.variableExpenses.map(e => (
              <TableRow key={e.id}>
                <TableCell>{e.categoryName}</TableCell>
                <TableCell align="right">{e.amount.toLocaleString()}</TableCell>
                <TableCell>{e.description ?? ''}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      {/* 損益サマリー */}
      <Paper variant="outlined">
        <Box p={2}>
          <Typography variant="h6" gutterBottom>{t('profit_loss_summary')}</Typography>
          <Table size="small">
            <TableBody>
              <TableRow>
                <TableCell>{t('sales_row')}</TableCell>
                <TableCell align="right">{data.monthlySales.toLocaleString()} {currency}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>{t('cost_row')}</TableCell>
                <TableCell align="right">{data.monthlyCost.toLocaleString()} {currency}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>{t('fixed_total_row')}</TableCell>
                <TableCell align="right">{data.fixedTotal.toLocaleString()} {currency}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>{t('variable_total_row')}</TableCell>
                <TableCell align="right">{data.variableTotal.toLocaleString()} {currency}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>{t('labor_cost_section')}</TableCell>
                <TableCell align="right">{data.laborTotal.toLocaleString()} {currency}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>{t('expense_total_row')}</TableCell>
                <TableCell align="right">{data.totalExpense.toLocaleString()} {currency}</TableCell>
              </TableRow>
              <TableRow sx={{ backgroundColor: 'grey.50' }}>
                <TableCell><Typography fontWeight="bold">{t('operating_profit')}</Typography></TableCell>
                <TableCell align="right">
                  <Typography
                    fontWeight="bold"
                    color={data.operatingProfit >= 0 ? 'success.main' : 'error.main'}
                  >
                    {data.operatingProfit.toLocaleString()} {currency}
                  </Typography>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Box>
      </Paper>
    </Box>
  );
}

/**
 * シミュレーション表示コンテナ（読み取り専用）。
 * 月次・年次・長期展望を切り替えてデータを閲覧できる。
 * yearMonth / onYearMonthChange は親から受け取りタブ間で年月を共有する。
 * 年次モードではアクティブなタブに応じて表示内容を切り替える：
 *   - タブ0（売上）→ SalesYearlyView（カテゴリー別集計表 + 月次グラフ）
 *   - タブ1（経費）→ ExpenseYearlyView（経費総括表 + 月次グラフ）
 *   - タブ2（借入）→ LoanYearlyView（借入表 + 残高グラフ）
 *   - タブ3（キャッシュフロー）→ キャッシュフローグラフ + 年次テーブル
 *   - タブ4（損益計算表）→ ProfitLossYearlyTable
 * 長期展望モードでは指定年数分の年次サマリーを横並びで表示する。
 */
export default function SimulationViewContainer({
  projectId,
  yearMonth,
  onYearMonthChange,
  currency,
  canEdit = false,
}: SimulationViewContainerProps) {
  const { t } = useTranslation();
  const [tab, setTab] = useState(0);
  const [viewMode, setViewMode] = useState<'monthly' | 'yearly' | 'longterm'>('monthly');
  const [longtermYears, setLongtermYears] = useState(5);

  const year = yearMonth.split('-')[0];

  return (
    <Box>
      <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" mb={2}>
        <Tabs value={tab} onChange={(_e, v: number) => setTab(v)}>
          <Tab label={t('sales_simulation_tab')} />
          <Tab label={t('expense_management_tab')} />
          <Tab label={t('loan_management_tab')} />
          <Tab label={t('cash_flow_tab')} />
          <Tab label={t('profit_loss_tab')} />
        </Tabs>
        <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
          <SalesSimulationPagination
            yearMonth={yearMonth}
            onYearMonthChange={onYearMonthChange}
            viewMode={viewMode}
            onViewModeChange={mode => setViewMode(mode)}
            showViewMode
          />
          {viewMode === 'longterm' && (
            <TextField
              label={t('forecast_years')}
              type="number"
              size="small"
              value={longtermYears}
              onChange={e => {
                const v = Number(e.target.value);
                if (v >= 1 && v <= 30) setLongtermYears(v);
              }}
              inputProps={{ min: 1, max: 30 }}
              sx={{ width: 100 }}
            />
          )}
        </Box>
      </Box>

      <Divider sx={{ mb: 2 }} />

      {/* 月次表示 */}
      {viewMode === 'monthly' && tab === 0 && (
        <SalesSimulationMonthlyView projectId={projectId} yearMonth={yearMonth} />
      )}
      {viewMode === 'monthly' && tab === 1 && (
        <ExpenseMonthlyView projectId={projectId} yearMonth={yearMonth} currency={currency} />
      )}
      {viewMode === 'monthly' && tab === 2 && (
        <LoanListContainer projectId={projectId} currency={currency} canEdit={canEdit} />
      )}
      {viewMode === 'monthly' && tab === 3 && (
        <CashFlowMonthlyView projectId={projectId} yearMonth={yearMonth} />
      )}
      {viewMode === 'monthly' && tab === 4 && (
        <ProfitLossYearlyTable projectId={projectId} year={year} currency={currency} />
      )}

      {/* 年次表示 */}
      {viewMode === 'yearly' && tab === 0 && (
        <SalesYearlyView projectId={projectId} year={year} currency={currency} />
      )}
      {viewMode === 'yearly' && tab === 1 && (
        <ExpenseYearlyView projectId={projectId} year={year} currency={currency} />
      )}
      {viewMode === 'yearly' && tab === 2 && (
        <LoanYearlyView projectId={projectId} year={year} currency={currency} />
      )}
      {viewMode === 'yearly' && tab === 3 && (
        <>
          <CashFlowCharts projectId={projectId} year={year} />
          <Box mt={3}>
            <CashFlowYearlyTable projectId={projectId} year={year} currency={currency} />
          </Box>
        </>
      )}
      {viewMode === 'yearly' && tab === 4 && (
        <ProfitLossYearlyTable projectId={projectId} year={year} currency={currency} />
      )}

      {/* 長期展望表示 */}
      {viewMode === 'longterm' && tab === 0 && (
        <SalesLongtermView
          projectId={projectId}
          startYear={year}
          yearsCount={longtermYears}
          currency={currency}
        />
      )}
      {viewMode === 'longterm' && tab === 1 && (
        <ExpenseLongtermView
          projectId={projectId}
          startYear={year}
          yearsCount={longtermYears}
          currency={currency}
        />
      )}
      {viewMode === 'longterm' && tab === 2 && (
        <LoanLongtermView
          projectId={projectId}
          startYear={year}
          yearsCount={longtermYears}
          currency={currency}
        />
      )}
      {viewMode === 'longterm' && tab === 3 && (
        <CashFlowLongtermTable
          projectId={projectId}
          startYear={year}
          yearsCount={longtermYears}
          currency={currency}
        />
      )}
      {viewMode === 'longterm' && tab === 4 && (
        <ProfitLossLongtermTable
          projectId={projectId}
          startYear={year}
          yearsCount={longtermYears}
          currency={currency}
        />
      )}
    </Box>
  );
}
