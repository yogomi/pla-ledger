import React, { useState } from 'react';
import { Box, Tab, Tabs } from '@mui/material';
import { useTranslation } from 'react-i18next';
import SalesSimulationPagination from './SalesSimulationPagination';
import SalesSimulationMonthlyEditor from './SalesSimulationMonthlyEditor';
import ExpenseMonthlyEditor from './ExpenseMonthlyEditor';
import ProfitLossYearlyTable from './ProfitLossYearlyTable';
import LoanListContainer from './LoanListContainer';

interface SimulationSheetContainerProps {
  projectId: string;
  /** 表示する年月 (YYYY-MM)。親コンポーネントで管理する。 */
  yearMonth: string;
  /** 年月変更時のコールバック。親コンポーネントに伝播する。 */
  onYearMonthChange: (ym: string) => void;
  /** 通貨コード (例: JPY, USD)。損益計算表の金額表示に使用する。 */
  currency: string;
}

/**
 * 売上シミュレーション・経費管理・損益計算表・借入管理の4タブコンテナ（入力ページ用）。
 * ページネーションで表示月を切り替えられる。月次表示のみ。
 * yearMonth / onYearMonthChange は親から受け取りタブ間で年月を共有する。
 */
export default function SimulationSheetContainer({
  projectId,
  yearMonth,
  onYearMonthChange,
  currency,
}: SimulationSheetContainerProps) {
  const { t } = useTranslation();
  const [tab, setTab] = useState(0);

  const year = yearMonth.split('-')[0];

  return (
    <Box>
      <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" mb={2}>
        <Tabs value={tab} onChange={(_e, v: number) => setTab(v)}>
          <Tab label={t('sales_simulation_tab')} />
          <Tab label={t('expense_management_tab')} />
          <Tab label={t('profit_loss_tab')} />
          <Tab label={t('loan_management_tab')} />
        </Tabs>
        <SalesSimulationPagination
          yearMonth={yearMonth}
          onYearMonthChange={onYearMonthChange}
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
        <ProfitLossYearlyTable projectId={projectId} year={year} currency={currency} />
      )}
      {tab === 3 && (
        <LoanListContainer projectId={projectId} currency={currency} canEdit={true} />
      )}
    </Box>
  );
}
