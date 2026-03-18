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
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useTranslation } from 'react-i18next';
import { useSalesSimulationMonthly, useExpenseSimulationMonthly } from '../hooks/useSalesSimulation';
import ProfitLossYearlyTable from './ProfitLossYearlyTable';
import SalesSimulationPagination from './SalesSimulationPagination';

interface SimulationViewContainerProps {
  projectId: string;
}

/** 現在の年月を YYYY-MM 形式で返す */
function getCurrentYearMonth(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
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
}: {
  projectId: string;
  yearMonth: string;
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
                <TableCell align="right">{data.monthlySales.toLocaleString()} 円</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>{t('cost_row')}</TableCell>
                <TableCell align="right">{data.monthlyCost.toLocaleString()} 円</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>{t('fixed_total_row')}</TableCell>
                <TableCell align="right">{data.fixedTotal.toLocaleString()} 円</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>{t('variable_total_row')}</TableCell>
                <TableCell align="right">{data.variableTotal.toLocaleString()} 円</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>{t('expense_total_row')}</TableCell>
                <TableCell align="right">{data.totalExpense.toLocaleString()} 円</TableCell>
              </TableRow>
              <TableRow sx={{ backgroundColor: 'grey.50' }}>
                <TableCell><Typography fontWeight="bold">{t('operating_profit')}</Typography></TableCell>
                <TableCell align="right">
                  <Typography
                    fontWeight="bold"
                    color={data.operatingProfit >= 0 ? 'success.main' : 'error.main'}
                  >
                    {data.operatingProfit.toLocaleString()} 円
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
 * 月次・年次を切り替えてデータを閲覧できる。
 */
export default function SimulationViewContainer({ projectId }: SimulationViewContainerProps) {
  const { t } = useTranslation();
  const [tab, setTab] = useState(0);
  const [yearMonth, setYearMonth] = useState(getCurrentYearMonth);
  const [viewMode, setViewMode] = useState<'monthly' | 'yearly'>('monthly');

  const year = yearMonth.split('-')[0];

  return (
    <Box>
      <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" mb={2}>
        {viewMode === 'monthly' && (
          <Tabs value={tab} onChange={(_e, v: number) => setTab(v)}>
            <Tab label={t('sales_simulation_tab')} />
            <Tab label={t('expense_management_tab')} />
          </Tabs>
        )}
        {viewMode === 'yearly' && (
          <Typography variant="h6">{t('profit_loss_yearly_label')}</Typography>
        )}
        <SalesSimulationPagination
          yearMonth={yearMonth}
          onYearMonthChange={setYearMonth}
          viewMode={viewMode}
          onViewModeChange={mode => {
            setViewMode(mode);
            setTab(0);
          }}
          showViewMode
        />
      </Box>

      <Divider sx={{ mb: 2 }} />

      {viewMode === 'monthly' && tab === 0 && (
        <SalesSimulationMonthlyView projectId={projectId} yearMonth={yearMonth} />
      )}
      {viewMode === 'monthly' && tab === 1 && (
        <ExpenseMonthlyView projectId={projectId} yearMonth={yearMonth} />
      )}
      {viewMode === 'yearly' && (
        <ProfitLossYearlyTable projectId={projectId} year={year} />
      )}
    </Box>
  );
}
