import React, { useState } from 'react';
import { Box, Tab, Tabs } from '@mui/material';
import { useTranslation } from 'react-i18next';
import SalesSimulationPagination from './SalesSimulationPagination';
import SalesSimulationMonthlyEditor from './SalesSimulationMonthlyEditor';
import ExpenseMonthlyEditor from './ExpenseMonthlyEditor';
import ProfitLossYearlyTable from './ProfitLossYearlyTable';

interface SimulationSheetContainerProps {
  projectId: string;
}

/** 現在の年月を YYYY-MM 形式で返す */
function getCurrentYearMonth(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/**
 * 売上シミュレーション・経費管理・損益計算表の3タブコンテナ（入力ページ用）。
 * ページネーションで表示月を切り替えられる。月次表示のみ。
 */
export default function SimulationSheetContainer({ projectId }: SimulationSheetContainerProps) {
  const { t } = useTranslation();
  const [tab, setTab] = useState(0);
  const [yearMonth, setYearMonth] = useState(getCurrentYearMonth);

  const year = yearMonth.split('-')[0];

  return (
    <Box>
      <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" mb={2}>
        <Tabs value={tab} onChange={(_e, v: number) => setTab(v)}>
          <Tab label={t('sales_simulation_tab')} />
          <Tab label={t('expense_management_tab')} />
          <Tab label={t('profit_loss_tab')} />
        </Tabs>
        <SalesSimulationPagination
          yearMonth={yearMonth}
          onYearMonthChange={setYearMonth}
          viewMode="monthly"
          onViewModeChange={() => undefined}
          showViewMode={false}
        />
      </Box>

      {tab === 0 && (
        <SalesSimulationMonthlyEditor projectId={projectId} yearMonth={yearMonth} />
      )}
      {tab === 1 && (
        <ExpenseMonthlyEditor projectId={projectId} yearMonth={yearMonth} />
      )}
      {tab === 2 && (
        <ProfitLossYearlyTable projectId={projectId} year={year} />
      )}
    </Box>
  );
}
