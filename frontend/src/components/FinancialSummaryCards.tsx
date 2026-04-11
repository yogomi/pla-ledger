import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
} from '@mui/material';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import CurrencyExchangeIcon from '@mui/icons-material/CurrencyExchange';
import StorefrontIcon from '@mui/icons-material/Storefront';
import { useTranslation } from 'react-i18next';
import { StartupCostItem } from './StartupCostTable';

interface FinancialSummaryCardsProps {
  /** スタートアップコスト一覧 */
  startupCostItems: StartupCostItem[];
  /** 初期現金残高 */
  initialCashBalance: number | null;
  /** 開業予定日 (YYYY-MM) */
  plannedOpeningDate: string | null;
  /** 通貨コード (例: JPY, USD) */
  currency: string;
}

/**
 * プロジェクトの財務サマリーをカード形式で表示するコンポーネント。
 * スタートアップコスト総額・初期現金残高・開業予定日・通貨を一覧表示する。
 */
export default function FinancialSummaryCards({
  startupCostItems,
  initialCashBalance,
  plannedOpeningDate,
  currency,
}: FinancialSummaryCardsProps) {
  const { t, i18n } = useTranslation();

  /** スタートアップコスト総額を計算 */
  const totalStartupCost = startupCostItems.reduce(
    (sum, item) => sum + item.quantity * item.unit_price,
    0,
  );

  /** 金額をロケールに合わせてフォーマット */
  const formatAmount = (amount: number): string => {
    return new Intl.NumberFormat(i18n.language, {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  /** YYYY-MM を表示用文字列にフォーマット */
  const formatMonth = (yearMonth: string): string => {
    const [y, m] = yearMonth.split('-').map(Number);
    const date = new Date(y, m - 1, 1);
    return date.toLocaleDateString(i18n.language, { year: 'numeric', month: 'long' });
  };

  const cards = [
    {
      icon: <StorefrontIcon fontSize="large" color="primary" />,
      label: t('startup_costs_section'),
      value: formatAmount(totalStartupCost),
    },
    {
      icon: <AccountBalanceWalletIcon fontSize="large" color="success" />,
      label: t('initial_cash_balance'),
      value: initialCashBalance != null ? formatAmount(initialCashBalance) : '-',
    },
    {
      icon: <CalendarMonthIcon fontSize="large" color="warning" />,
      label: t('planned_opening_date'),
      value: plannedOpeningDate ? formatMonth(plannedOpeningDate) : '-',
    },
    {
      icon: <CurrencyExchangeIcon fontSize="large" color="info" />,
      label: t('currency'),
      value: currency,
    },
  ];

  return (
    <Grid container spacing={2} mb={3}>
      {cards.map(card => (
        <Grid item xs={12} sm={6} md={3} key={card.label}>
          <Card elevation={2} sx={{ height: '100%' }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1.5}>
                {card.icon}
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block">
                    {card.label}
                  </Typography>
                  <Typography variant="h6" fontWeight="bold">
                    {card.value}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}
