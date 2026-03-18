import React, { useState } from 'react';
import { Box, Tab, Tabs } from '@mui/material';
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
 * 売上シミュレーション・経費管理・損益計算表の3タブコンテナ。
 * ページネーションで表示月/年を切り替えられる。
 */
export default function SimulationSheetContainer({ projectId }: SimulationSheetContainerProps) {
  const [tab, setTab] = useState(0);
  const [yearMonth, setYearMonth] = useState(getCurrentYearMonth);
  const [viewMode, setViewMode] = useState<'monthly' | 'yearly'>('monthly');

  const year = yearMonth.split('-')[0];

  return (
    <Box>
      <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" mb={2}>
        <Tabs value={tab} onChange={(_e, v: number) => setTab(v)}>
          <Tab label="売上シミュレーション" />
          <Tab label="経費管理" />
          <Tab label="損益計算表" />
        </Tabs>
        <SalesSimulationPagination
          yearMonth={yearMonth}
          onYearMonthChange={setYearMonth}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
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
