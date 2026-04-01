import React from 'react';
import { useQueries } from '@tanstack/react-query';
import {
  Alert,
  Box,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { getSalesSimulationYearly } from '../api/salesSimulations';

interface SalesLongtermViewProps {
  projectId: string;
  /** 表示開始年 (YYYY)。 */
  startYear: string;
  /** 表示する年数。 */
  yearsCount: number;
  /** 通貨コード (例: JPY, USD)。 */
  currency: string;
}

/**
 * 売上シミュレーションの長期展望コンポーネント。
 * 指定開始年から yearsCount 年分の年間売上をカテゴリー別に表示する。
 */
export default function SalesLongtermView({
  projectId,
  startYear,
  yearsCount,
  currency,
}: SalesLongtermViewProps) {
  const { t } = useTranslation();
  const years = Array.from({ length: yearsCount }, (_, i) => String(Number(startYear) + i));

  const results = useQueries({
    queries: years.map(year => ({
      queryKey: ['salesSimulationYearly', projectId, year],
      queryFn: () => getSalesSimulationYearly(projectId, year),
      enabled: Boolean(projectId) && Boolean(year),
    })),
  });

  const isLoading = results.some(r => r.isLoading);
  const isError = results.some(r => r.isError);

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" mt={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (isError) {
    return <Alert severity="error">{t('load_error')}</Alert>;
  }

  // 全年にわたるカテゴリー名を重複なく収集する（初出順）
  const categoryNames: string[] = [];
  results.forEach(r => {
    r.data?.categories.forEach(cat => {
      if (!categoryNames.includes(cat.categoryName)) {
        categoryNames.push(cat.categoryName);
      }
    });
  });

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        {t('longterm_sales_title')}
      </Typography>
      <Paper variant="outlined" sx={{ overflow: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: 'grey.100' }}>
              <TableCell>{t('category_name_col')}</TableCell>
              {years.map(year => (
                <TableCell key={year} align="right">
                  {t('year_label', { year })}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {categoryNames.map(catName => (
              <TableRow key={catName}>
                <TableCell>{catName}</TableCell>
                {results.map((r, i) => {
                  const cat = r.data?.categories.find(c => c.categoryName === catName);
                  return (
                    <TableCell key={years[i]} align="right">
                      {(cat?.yearlyTotal ?? 0).toLocaleString()}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
            <TableRow sx={{ backgroundColor: 'grey.50' }}>
              <TableCell>
                <Typography fontWeight="bold">{t('yearly_total')}</Typography>
              </TableCell>
              {results.map((r, i) => (
                <TableCell key={years[i]} align="right">
                  <Typography fontWeight="bold">
                    {(r.data?.yearlyTotal ?? 0).toLocaleString()} {currency}
                  </Typography>
                </TableCell>
              ))}
            </TableRow>
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}
