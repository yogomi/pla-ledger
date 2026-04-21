import React, { useMemo } from 'react';
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { CostType, StartupCostItem } from './StartupCostTable';

interface StartupCostSummaryTableProps {
  items: StartupCostItem[];
  currency: string;
}

const COST_TYPE_ORDER: CostType[] = ['equipment', 'renovation', 'deposit', 'intangible', 'founding', 'marketing', 'consumables', 'initial_inventory', 'working_capital'];

/**
 * スタートアップコストの費目区分ごとの件数・合計金額を集計して表示する。
 * 表示は読み取り専用で、件数が0の費目区分は表示しない。
 */
export default function StartupCostSummaryTable({
  items,
  currency,
}: StartupCostSummaryTableProps) {
  const { t } = useTranslation();

  const formatCurrency = (value: number): string =>
    new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(value);

  const rows = useMemo(() => {
    const aggregates: Record<CostType, { count: number; totalAmount: number }> = {
      equipment: { count: 0, totalAmount: 0 },
      renovation: { count: 0, totalAmount: 0 },
      deposit: { count: 0, totalAmount: 0 },
      intangible: { count: 0, totalAmount: 0 },
      founding: { count: 0, totalAmount: 0 },
      marketing: { count: 0, totalAmount: 0 },
      consumables: { count: 0, totalAmount: 0 },
      initial_inventory: { count: 0, totalAmount: 0 },
      working_capital: { count: 0, totalAmount: 0 },
    };

    for (const item of items) {
      aggregates[item.cost_type].count += 1;
      aggregates[item.cost_type].totalAmount += item.quantity * item.unit_price;
    }

    return COST_TYPE_ORDER
      .map(costType => ({
        costType,
        count: aggregates[costType].count,
        totalAmount: aggregates[costType].totalAmount,
      }))
      .filter(row => row.count > 0);
  }, [items]);

  const totalCount = rows.reduce((sum, row) => sum + row.count, 0);
  const totalAmount = rows.reduce((sum, row) => sum + row.totalAmount, 0);

  const costTypeLabel = (costType: CostType): string => {
    const labels: Record<CostType, string> = {
      equipment: t('cost_type_equipment'),
      renovation: t('cost_type_renovation'),
      deposit: t('cost_type_deposit'),
      intangible: t('cost_type_intangible'),
      founding: t('cost_type_founding'),
      marketing: t('cost_type_marketing'),
      consumables: t('cost_type_consumables'),
      initial_inventory: t('cost_type_initial_inventory'),
      working_capital: t('cost_type_working_capital'),
    };
    return labels[costType];
  };

  return (
    <Paper variant="outlined" sx={{ overflow: 'auto' }}>
      <Table size="small">
        <TableHead>
          <TableRow sx={{ backgroundColor: 'grey.100' }}>
            <TableCell>{t('cost_type')}</TableCell>
            <TableCell align="right">{t('count')}</TableCell>
            <TableCell align="right">{t('total_amount')} ({currency})</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={3} align="center">
                <Typography variant="body2" color="text.secondary">
                  {t('no_items')}
                </Typography>
              </TableCell>
            </TableRow>
          )}
          {rows.map(row => (
            <TableRow key={row.costType}>
              <TableCell>{costTypeLabel(row.costType)}</TableCell>
              <TableCell align="right">{row.count}</TableCell>
              <TableCell align="right">{formatCurrency(row.totalAmount)}</TableCell>
            </TableRow>
          ))}
          <TableRow>
            <TableCell sx={{ fontWeight: 'bold' }}>{t('total')}</TableCell>
            <TableCell align="right" sx={{ fontWeight: 'bold' }}>{totalCount}</TableCell>
            <TableCell align="right" sx={{ fontWeight: 'bold' }}>
              {formatCurrency(totalAmount)}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </Paper>
  );
}
