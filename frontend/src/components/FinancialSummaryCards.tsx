import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
} from '@mui/material';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import CurrencyExchangeIcon from '@mui/icons-material/CurrencyExchange';
import StorefrontIcon from '@mui/icons-material/Storefront';
import CreditScoreIcon from '@mui/icons-material/CreditScore';
import { useTranslation } from 'react-i18next';
import { StartupCostItem } from './StartupCostTable';
import { Loan } from '../types/Loan';

interface FinancialSummaryCardsProps {
  /** スタートアップコスト一覧 */
  startupCostItems: StartupCostItem[];
  /** 開業予定日 (YYYY-MM) */
  plannedOpeningDate: string | null;
  /** 通貨コード (例: JPY, USD) */
  currency: string;
  /** 借入一覧（ロールがある場合のみ渡す） */
  loans?: Loan[];
}

/**
 * プロジェクトの財務サマリーをカード形式で表示するコンポーネント。
 * スタートアップコスト総額・初期現金残高・開業予定日・通貨・初期借入計画を一覧表示する。
 */
export default function FinancialSummaryCards({
  startupCostItems,
  plannedOpeningDate,
  currency,
  loans,
}: FinancialSummaryCardsProps) {
  const { t, i18n } = useTranslation();

  /** スタートアップコスト総額を計算 */
  const totalStartupCost = startupCostItems.reduce(
    (sum, item) => sum + item.quantity * item.unit_price,
    0,
  );

  /**
   * 開業予定日前後24ヶ月内の借入総額を計算する。
   * 開業予定日が未設定の場合は全借入を対象とする。
   */
  const totalLoanAmount = (() => {
    if (!loans || loans.length === 0) return null;
    if (!plannedOpeningDate) {
      return loans.reduce((sum, l) => sum + l.principalAmount, 0);
    }
    const [baseY, baseM] = plannedOpeningDate.split('-').map(Number);
    const baseMonthIndex = baseY * 12 + baseM;
    const filtered = loans.filter(l => {
      const loanYm = l.loanDate.substring(0, 7); // YYYY-MM
      const [ly, lm] = loanYm.split('-').map(Number);
      const diff = Math.abs(ly * 12 + lm - baseMonthIndex);
      return diff <= 24;
    });
    return filtered.reduce((sum, l) => sum + l.principalAmount, 0);
  })();

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
    ...(loans !== undefined
      ? [{
        icon: <CreditScoreIcon fontSize="large" color="secondary" />,
        label: t('initial_borrowing_plan'),
        value: totalLoanAmount !== null ? formatAmount(totalLoanAmount) : '-',
      }]
      : []),
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
        <Grid
          item
          xs={12}
          sm={6}
          md={loans !== undefined ? 3 : 4}
          key={card.label}
        >
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
