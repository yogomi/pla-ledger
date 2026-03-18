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
  const { data, isLoading, isError } = useSalesSimulationMonthly(projectId, yearMonth);

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" mt={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (isError || !data) {
    return <Alert severity="error">データの読み込みに失敗しました。</Alert>;
  }

  return (
    <Box>
      {data.isInherited && (
        <Alert severity="info" sx={{ mb: 2 }}>
          このデータは前月から継承されています。
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
                    <TableCell>品目名</TableCell>
                    <TableCell align="right">単価</TableCell>
                    <TableCell align="right">数量</TableCell>
                    <TableCell align="right">稼働日数</TableCell>
                    <TableCell align="right">原価率 (%)</TableCell>
                    <TableCell align="right">月間売上</TableCell>
                    <TableCell align="right">月間原価</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {cat.items.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        <Typography variant="body2" color="text.secondary">
                          品目なし
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
          月間売上合計: {data.monthlyTotal.toLocaleString()} 円
        </Typography>
        <Typography variant="body2" color="text.secondary">
          月間原価合計: {data.monthlyCost.toLocaleString()} 円
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
  const { data, isLoading, isError } = useExpenseSimulationMonthly(projectId, yearMonth);

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" mt={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (isError || !data) {
    return <Alert severity="error">データの読み込みに失敗しました。</Alert>;
  }

  return (
    <Box display="flex" flexDirection="column" gap={3}>
      {/* 固定費 */}
      <Paper variant="outlined">
        <Box p={2} borderBottom={1} borderColor="divider">
          <Typography variant="h6">固定費</Typography>
        </Box>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: 'grey.100' }}>
              <TableCell>カテゴリ名</TableCell>
              <TableCell align="right">月額</TableCell>
              <TableCell>備考</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.fixedExpenses.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} align="center">
                  <Typography variant="body2" color="text.secondary">項目なし</Typography>
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
          <Typography variant="h6">変動費</Typography>
        </Box>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: 'grey.100' }}>
              <TableCell>カテゴリ名</TableCell>
              <TableCell align="right">月額</TableCell>
              <TableCell>備考</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.variableExpenses.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} align="center">
                  <Typography variant="body2" color="text.secondary">項目なし</Typography>
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
          <Typography variant="h6" gutterBottom>損益サマリー</Typography>
          <Table size="small">
            <TableBody>
              <TableRow>
                <TableCell>売上</TableCell>
                <TableCell align="right">{data.monthlySales.toLocaleString()} 円</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>原価</TableCell>
                <TableCell align="right">{data.monthlyCost.toLocaleString()} 円</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>固定費合計</TableCell>
                <TableCell align="right">{data.fixedTotal.toLocaleString()} 円</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>変動費合計</TableCell>
                <TableCell align="right">{data.variableTotal.toLocaleString()} 円</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>経費合計</TableCell>
                <TableCell align="right">{data.totalExpense.toLocaleString()} 円</TableCell>
              </TableRow>
              <TableRow sx={{ backgroundColor: 'grey.50' }}>
                <TableCell><Typography fontWeight="bold">営業利益</Typography></TableCell>
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
  const [tab, setTab] = useState(0);
  const [yearMonth, setYearMonth] = useState(getCurrentYearMonth);
  const [viewMode, setViewMode] = useState<'monthly' | 'yearly'>('monthly');

  const year = yearMonth.split('-')[0];

  return (
    <Box>
      <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" mb={2}>
        {viewMode === 'monthly' && (
          <Tabs value={tab} onChange={(_e, v: number) => setTab(v)}>
            <Tab label="売上シミュレーション" />
            <Tab label="経費管理" />
          </Tabs>
        )}
        {viewMode === 'yearly' && (
          <Typography variant="h6">損益計算表（年次）</Typography>
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
