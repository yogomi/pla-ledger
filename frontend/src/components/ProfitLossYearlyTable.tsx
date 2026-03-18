import React from 'react';
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
import { useProfitLossYearly } from '../hooks/useSalesSimulation';

interface ProfitLossYearlyTableProps {
  projectId: string;
  year: string;
}

/**
 * 指定年の損益計算書を月次一覧で表示するコンポーネント。
 * 最終行に年次合計を表示する。
 */
export default function ProfitLossYearlyTable({ projectId, year }: ProfitLossYearlyTableProps) {
  const { data, isLoading, isError } = useProfitLossYearly(projectId, year);

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

  const { months, yearly } = data;

  return (
    <Paper variant="outlined" sx={{ overflow: 'auto' }}>
      <Table size="small">
        <TableHead>
          <TableRow sx={{ backgroundColor: 'grey.100' }}>
            <TableCell>月</TableCell>
            <TableCell align="right">売上</TableCell>
            <TableCell align="right">原価</TableCell>
            <TableCell align="right">固定費</TableCell>
            <TableCell align="right">変動費</TableCell>
            <TableCell align="right">経費合計</TableCell>
            <TableCell align="right">営業利益</TableCell>
            <TableCell align="right">利益率</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {months.map(row => {
            const [, m] = row.yearMonth.split('-');
            return (
              <TableRow key={row.yearMonth}>
                <TableCell>
                  <Box display="flex" alignItems="center" gap={0.5}>
                    {`${m}月`}
                    {row.isInherited && (
                      <Typography variant="caption" color="text.secondary">
                        (継承)
                      </Typography>
                    )}
                  </Box>
                </TableCell>
                <TableCell align="right">{row.monthlySales.toLocaleString()}</TableCell>
                <TableCell align="right">{row.monthlyCost.toLocaleString()}</TableCell>
                <TableCell align="right">{row.fixedTotal.toLocaleString()}</TableCell>
                <TableCell align="right">{row.variableTotal.toLocaleString()}</TableCell>
                <TableCell align="right">{row.totalExpense.toLocaleString()}</TableCell>
                <TableCell
                  align="right"
                  sx={{ color: row.operatingProfit >= 0 ? 'success.main' : 'error.main' }}
                >
                  {row.operatingProfit.toLocaleString()}
                </TableCell>
                <TableCell align="right">
                  {`${row.profitRate.toFixed(1)}%`}
                </TableCell>
              </TableRow>
            );
          })}
          {/* 年次合計行 */}
          <TableRow sx={{ backgroundColor: 'grey.50', fontWeight: 'bold' }}>
            <TableCell><Typography fontWeight="bold">年間合計</Typography></TableCell>
            <TableCell align="right">
              <Typography fontWeight="bold">{yearly.totalSales.toLocaleString()}</Typography>
            </TableCell>
            <TableCell align="right">
              <Typography fontWeight="bold">{yearly.totalCost.toLocaleString()}</Typography>
            </TableCell>
            <TableCell align="right">
              <Typography fontWeight="bold">{yearly.totalFixed.toLocaleString()}</Typography>
            </TableCell>
            <TableCell align="right">
              <Typography fontWeight="bold">{yearly.totalVariable.toLocaleString()}</Typography>
            </TableCell>
            <TableCell align="right">
              <Typography fontWeight="bold">{yearly.totalExpense.toLocaleString()}</Typography>
            </TableCell>
            <TableCell
              align="right"
              sx={{ color: yearly.totalOperatingProfit >= 0 ? 'success.main' : 'error.main' }}
            >
              <Typography fontWeight="bold">
                {yearly.totalOperatingProfit.toLocaleString()}
              </Typography>
            </TableCell>
            <TableCell align="right">
              <Typography fontWeight="bold">
                {`${yearly.averageProfitRate.toFixed(1)}%`}
              </Typography>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </Paper>
  );
}
