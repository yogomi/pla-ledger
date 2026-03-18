import React from 'react';
import { Box, IconButton, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

interface SalesSimulationPaginationProps {
  yearMonth: string;
  onYearMonthChange: (ym: string) => void;
  viewMode: 'monthly' | 'yearly';
  onViewModeChange: (mode: 'monthly' | 'yearly') => void;
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

/**
 * 売上シミュレーション用のページネーションコンポーネント。
 * 月次/年次の切り替えと前後ナビゲーションを提供する。
 */
export default function SalesSimulationPagination({
  yearMonth,
  onYearMonthChange,
  viewMode,
  onViewModeChange,
}: SalesSimulationPaginationProps) {
  const [year, month] = yearMonth.split('-');

  const handlePrev = () => {
    if (viewMode === 'monthly') {
      onYearMonthChange(addMonths(yearMonth, -1));
    } else {
      onYearMonthChange(addYears(yearMonth, -1));
    }
  };

  const handleNext = () => {
    if (viewMode === 'monthly') {
      onYearMonthChange(addMonths(yearMonth, 1));
    } else {
      onYearMonthChange(addYears(yearMonth, 1));
    }
  };

  const label = viewMode === 'monthly'
    ? `${year}年${month}月`
    : `${year}年`;

  return (
    <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
      <ToggleButtonGroup
        value={viewMode}
        exclusive
        size="small"
        onChange={(_e, val: 'monthly' | 'yearly' | null) => {
          if (val !== null) onViewModeChange(val);
        }}
      >
        <ToggleButton value="monthly">月次</ToggleButton>
        <ToggleButton value="yearly">年次</ToggleButton>
      </ToggleButtonGroup>
      <Box display="flex" alignItems="center">
        <IconButton size="small" onClick={handlePrev} aria-label="前へ">
          <ChevronLeftIcon />
        </IconButton>
        <Typography variant="subtitle1" sx={{ minWidth: '100px', textAlign: 'center' }}>
          {label}
        </Typography>
        <IconButton size="small" onClick={handleNext} aria-label="次へ">
          <ChevronRightIcon />
        </IconButton>
      </Box>
    </Box>
  );
}
