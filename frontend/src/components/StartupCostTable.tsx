import React, { useCallback } from 'react';
import {
  Table, TableBody, TableCell, TableHead, TableRow,
  TextField, Button, IconButton, Box, Paper, Typography, Select, MenuItem,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { useTranslation } from 'react-i18next';

/** スタートアップコストの費目区分 */
export type CostType = 'equipment' | 'renovation' | 'deposit' | 'intangible' | 'founding' | 'marketing' | 'consumables' | 'initial_inventory' | 'working_capital';

export interface StartupCostItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  cost_type: CostType;
  allocation_month: string;
}

interface StartupCostTableProps {
  items: StartupCostItem[];
  currency: string;
  readOnly?: boolean;
  /** 開業予定日（YYYY-MM形式）。新規行追加時の反映月デフォルト値として使用する */
  plannedOpeningDate?: string | null;
  onItemsChange?: (items: StartupCostItem[]) => void;
}

/** デフォルトの反映月（引数があればその月、なければ現在の年月） */
function defaultAllocationMonth(plannedOpeningDate?: string | null): string {
  if (plannedOpeningDate) return plannedOpeningDate;
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/**
 * スタートアップコストの行一覧をテーブルで表示・編集するコンポーネント。
 * readOnly が true の場合は表示専用になる。
 */
export default function StartupCostTable({
  items,
  currency,
  readOnly = false,
  plannedOpeningDate,
  onItemsChange,
}: StartupCostTableProps) {
  const { t } = useTranslation();

  const handleAddRow = () => {
    if (!onItemsChange) return;
    const newId = crypto.randomUUID();
    onItemsChange([
      ...items,
      {
        id: newId,
        description: '',
        quantity: 1,
        unit_price: 0,
        cost_type: 'founding',
        allocation_month: defaultAllocationMonth(plannedOpeningDate),
      },
    ]);
  };

  const handleRowChange = (
    id: string,
    field: keyof StartupCostItem,
    value: string | number,
  ) => {
    if (!onItemsChange) return;
    onItemsChange(
      items.map(item => (item.id === id ? { ...item, [field]: value } : item)),
    );
  };

  const handleDeleteRow = (id: string) => {
    if (!onItemsChange) return;
    onItemsChange(items.filter(item => item.id !== id));
  };

  const formatCurrency = useCallback(
    (value: number): string =>
      new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(value),
    [currency],
  );

  const total = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);

  const costTypeLabel = (ct: CostType): string => {
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
    return labels[ct] ?? ct;
  };

  const colSpan = readOnly ? 6 : 7;

  return (
    <Paper variant="outlined" sx={{ overflow: 'auto' }}>
      <Table size="small">
        <TableHead>
          <TableRow sx={{ backgroundColor: 'grey.100' }}>
            <TableCell>{t('description')}</TableCell>
            <TableCell>{t('cost_type')}</TableCell>
            <TableCell>{t('allocation_month')}</TableCell>
            <TableCell align="right">{t('quantity')}</TableCell>
            <TableCell align="right">{t('unit_price')} ({currency})</TableCell>
            <TableCell align="right">{t('subtotal')} ({currency})</TableCell>
            {!readOnly && <TableCell align="center">{t('action')}</TableCell>}
          </TableRow>
        </TableHead>
        <TableBody>
          {items.length === 0 && (
            <TableRow>
              <TableCell colSpan={colSpan} align="center">
                <Typography variant="body2" color="text.secondary">
                  {t('no_items')}
                </Typography>
              </TableCell>
            </TableRow>
          )}
          {items.map(item => (
            <TableRow key={item.id}>
              <TableCell>
                {readOnly ? (
                  item.description
                ) : (
                  <TextField
                    size="small"
                    value={item.description}
                    onChange={e => handleRowChange(item.id, 'description', e.target.value)}
                    fullWidth
                    variant="outlined"
                    sx={{ minWidth: '180px' }}
                  />
                )}
              </TableCell>
              <TableCell>
                {readOnly ? (
                  costTypeLabel(item.cost_type)
                ) : (
                  <Select
                    size="small"
                    value={item.cost_type}
                    onChange={e => handleRowChange(item.id, 'cost_type', e.target.value)}
                    sx={{ minWidth: '160px' }}
                  >
                    <MenuItem value="equipment">{t('cost_type_equipment')}</MenuItem>
                    <MenuItem value="renovation">{t('cost_type_renovation')}</MenuItem>
                    <MenuItem value="deposit">{t('cost_type_deposit')}</MenuItem>
                    <MenuItem value="intangible">{t('cost_type_intangible')}</MenuItem>
                    <MenuItem value="founding">{t('cost_type_founding')}</MenuItem>
                    <MenuItem value="marketing">{t('cost_type_marketing')}</MenuItem>
                    <MenuItem value="consumables">{t('cost_type_consumables')}</MenuItem>
                    <MenuItem value="initial_inventory">{t('cost_type_initial_inventory')}</MenuItem>
                    <MenuItem value="working_capital">{t('cost_type_working_capital')}</MenuItem>
                  </Select>
                )}
              </TableCell>
              <TableCell>
                {readOnly ? (
                  item.allocation_month
                ) : (
                  <TextField
                    size="small"
                    type="month"
                    value={item.allocation_month}
                    onChange={e =>
                      handleRowChange(item.id, 'allocation_month', e.target.value)
                    }
                    variant="outlined"
                    InputLabelProps={{ shrink: true }}
                    sx={{ minWidth: '140px' }}
                  />
                )}
              </TableCell>
              <TableCell align="right">
                {readOnly ? (
                  item.quantity
                ) : (
                  <TextField
                    size="small"
                    type="number"
                    value={item.quantity}
                    onChange={e =>
                      handleRowChange(item.id, 'quantity', Number(e.target.value))
                    }
                    variant="outlined"
                    inputProps={{ min: 0, step: 1 }}
                    sx={{ maxWidth: '80px' }}
                  />
                )}
              </TableCell>
              <TableCell align="right">
                {readOnly ? (
                  formatCurrency(item.unit_price)
                ) : (
                  <TextField
                    size="small"
                    type="number"
                    value={item.unit_price}
                    onChange={e =>
                      handleRowChange(item.id, 'unit_price', Number(e.target.value))
                    }
                    variant="outlined"
                    inputProps={{ min: 0, step: 0.01 }}
                    sx={{ maxWidth: '120px' }}
                  />
                )}
              </TableCell>
              <TableCell align="right">
                {formatCurrency(item.quantity * item.unit_price)}
              </TableCell>
              {!readOnly && (
                <TableCell align="center">
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => handleDeleteRow(item.id)}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Box
        sx={{
          p: 2,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderTop: '1px solid',
          borderColor: 'divider',
        }}
      >
        {!readOnly ? (
          <Button startIcon={<AddIcon />} onClick={handleAddRow} variant="outlined" size="small">
            {t('add_row')}
          </Button>
        ) : (
          <Box />
        )}
        <Typography variant="subtitle1" fontWeight="bold">
          {t('total')}: {formatCurrency(total)}
        </Typography>
      </Box>
    </Paper>
  );
}
