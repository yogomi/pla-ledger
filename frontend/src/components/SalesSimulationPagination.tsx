import React from 'react';
import { Box, IconButton, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { useTranslation } from 'react-i18next';

interface SalesSimulationPaginationProps {
  yearMonth: string;
  onYearMonthChange: (ym: string) => void;
  viewMode: 'monthly' | 'yearly' | 'longterm';
  onViewModeChange: (mode: 'monthly' | 'yearly' | 'longterm') => void;
  showViewMode?: boolean;
}

/** YYYY-MM 文字列に月数を加算して返す */
function addMonths(yearMonth: string, delta: number): string {
  const [y, m] = yearMonth.split('-').map(Number);
  const date = new Date(y, m - 1 + delta, 1);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/** YYYY-MM 文字列から年を加算して返す */
function addYears(yearMonth: string, delta: number): string {
  const [y, m] = yearMonth.split('-');
  return `${Number(y) + delta}-${m}`;
}

const MIN_YEAR_MONTH = '2025-01';
const MAX_YEAR_MONTH = '2035-12';

/**
 * 売上シミュレーション用のページネーションコンポーネント。
 * 月次/年次の切り替えと前後ナビゲーションを提供する。
 */
export default function SalesSimulationPagination({
  yearMonth,
  onYearMonthChange,
  viewMode,
  onViewModeChange,
  showViewMode = true,
}: SalesSimulationPaginationProps) {
  const { t } = useTranslation();
  const [year, month] = yearMonth.split('-');

  const isPrevDisabled = viewMode === 'monthly'
    ? yearMonth <= MIN_YEAR_MONTH
    : Number(year) <= Number(MIN_YEAR_MONTH.split('-')[0]);

  const isNextDisabled = viewMode === 'monthly'
    ? yearMonth >= MAX_YEAR_MONTH
    : Number(year) >= Number(MAX_YEAR_MONTH.split('-')[0]);

  const handlePrev = () => {
    if (isPrevDisabled) return;
    if (viewMode === 'monthly') {
      onYearMonthChange(addMonths(yearMonth, -1));
    } else {
      onYearMonthChange(addYears(yearMonth, -1));
    }
  };

  const handleNext = () => {
    if (isNextDisabled) return;
    if (viewMode === 'monthly') {
      onYearMonthChange(addMonths(yearMonth, 1));
    } else {
      onYearMonthChange(addYears(yearMonth, 1));
    }
  };

  const label = viewMode === 'monthly'
    ? t('year_month_label', { year, month: Number(month) })
    : t('year_label', { year });

  return (
    <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
      {showViewMode && (
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          size="small"
          onChange={(_e, val: 'monthly' | 'yearly' | 'longterm' | null) => {
            if (val !== null) onViewModeChange(val);
          }}
        >
          <ToggleButton value="monthly">{t('monthly')}</ToggleButton>
          <ToggleButton value="yearly">{t('yearly')}</ToggleButton>
          <ToggleButton value="longterm">{t('longterm')}</ToggleButton>
        </ToggleButtonGroup>
      )}
      <Box display="flex" alignItems="center">
        <IconButton size="small" onClick={handlePrev} disabled={isPrevDisabled} aria-label={t('prev')}>
          <ChevronLeftIcon />
        </IconButton>
        <Typography variant="subtitle1" sx={{ minWidth: '100px', textAlign: 'center' }}>
          {label}
        </Typography>
        <IconButton size="small" onClick={handleNext} disabled={isNextDisabled} aria-label={t('next')}>
          <ChevronRightIcon />
        </IconButton>
      </Box>
    </Box>
  );
}
