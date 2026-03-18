import React, { useCallback } from 'react';
import {
  Table, TableBody, TableCell, TableHead, TableRow,
  TextField, Button, IconButton, Box, Paper, Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { useTranslation } from 'react-i18next';

export interface StartupCostItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
}

interface StartupCostTableProps {
  items: StartupCostItem[];
  currency: string;
  readOnly?: boolean;
  onItemsChange?: (items: StartupCostItem[]) => void;
}

/**
 * スタートアップコストの行一覧をテーブルで表示・編集するコンポーネント。
 * readOnly が true の場合は表示専用になる。
 */
export default function StartupCostTable({
  items,
  currency,
  readOnly = false,
  onItemsChange,
}: StartupCostTableProps) {
  const { t } = useTranslation();

  const handleAddRow = () => {
    if (!onItemsChange) return;
    const newId = crypto.randomUUID();
    onItemsChange([
      ...items,
      { id: newId, description: '', quantity: 1, unit_price: 0 },
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

  return (
    <Paper variant="outlined" sx={{ overflow: 'auto' }}>
      <Table size="small">
        <TableHead>
          <TableRow sx={{ backgroundColor: 'grey.100' }}>
            <TableCell>{t('description')}</TableCell>
            <TableCell align="right">{t('quantity')}</TableCell>
            <TableCell align="right">{t('unit_price')} ({currency})</TableCell>
            <TableCell align="right">{t('subtotal')} ({currency})</TableCell>
            {!readOnly && <TableCell align="center">{t('action')}</TableCell>}
          </TableRow>
        </TableHead>
        <TableBody>
          {items.length === 0 && (
            <TableRow>
              <TableCell colSpan={readOnly ? 4 : 5} align="center">
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
                  <IconButton size="small" color="error" onClick={() => handleDeleteRow(item.id)}>
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
