import { useState } from 'react';
import { Box, Tab, Tabs } from '@mui/material';
import { useTranslation } from 'react-i18next';
import SalesSimulationPagination from './SalesSimulationPagination';
import SalesSimulationMonthlyEditor from './SalesSimulationMonthlyEditor';
import ExpenseMonthlyEditor from './ExpenseMonthlyEditor';
import LoanListContainer from './LoanListContainer';
import CashFlowMonthlyEditor from './CashFlowMonthlyEditor';
import FixedAssetManager from './FixedAssetManager';

interface SimulationSheetContainerProps {
  projectId: string;
  /** 表示する年月 (YYYY-MM)。親コンポーネントで管理する。 */
  yearMonth: string;
  /** 年月変更時のコールバック。親コンポーネントに伝播する。 */
  onYearMonthChange: (ym: string) => void;
  /** 通貨コード (例: JPY, USD)。金額表示に使用する。 */
  currency: string;
}

/**
 * 売上シミュレーション・経費管理・固定資産・借入管理・キャッシュフローの5タブコンテナ（入力ページ用）。
 * ページネーションで表示月を切り替えられる。月次表示のみ。
 * yearMonth / onYearMonthChange は親から受け取りタブ間で年月を共有する。
 * 損益計算表は事業計画閲覧（SimulationViewContainer）に移動済み。
 */
export default function SimulationSheetContainer({
  projectId,
  yearMonth,
  onYearMonthChange,
  currency,
}: SimulationSheetContainerProps) {
  const { t } = useTranslation();

  // 入力側タブの概念 ID 順（表示側とインデックスが異なる）
  const INPUT_TABS = ['sales', 'expense', 'fixed_assets', 'loans', 'cashflow'] as const;
  // 表示側にない概念 ID を入力側の最近傍にフォールバック
  const INPUT_FALLBACK: Record<string, string> = { profit_loss: 'sales' };

  const [tab, setTab] = useState(() => {
    const stored = localStorage.getItem(`simTab_${projectId}`);
    if (!stored) return 0;
    const mapped = INPUT_FALLBACK[stored] ?? stored;
    const idx = INPUT_TABS.indexOf(mapped as typeof INPUT_TABS[number]);
    return idx >= 0 ? idx : 0;
  });

  const handleTabChange = (_e: React.SyntheticEvent, v: number) => {
    setTab(v);
    localStorage.setItem(`simTab_${projectId}`, INPUT_TABS[v]);
  };

  return (
    <Box>
      <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" mb={2}>
        <Tabs value={tab} onChange={handleTabChange}>
          <Tab label={t('sales_simulation_tab')} />
          <Tab label={t('expense_management_tab')} />
          <Tab label={t('fixed_asset_management_tab')} />
          <Tab label={t('loan_management_tab')} />
          <Tab label={t('cash_flow_tab')} />
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
        <FixedAssetManager projectId={projectId} />
      )}
      {tab === 3 && (
        <LoanListContainer projectId={projectId} currency={currency} canEdit={true} />
      )}
      {tab === 4 && (
        <CashFlowMonthlyEditor projectId={projectId} yearMonth={yearMonth} />
      )}
    </Box>
  );
}
