import React, { useEffect, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SaveIcon from '@mui/icons-material/Save';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { useFieldArray, useForm, Controller, useWatch, Control } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import {
  useSalesSimulationMonthly,
  useUpdateSalesSimulation,
  useCreateSalesCategory,
  useUpdateSalesCategory,
  useDeleteSalesCategory,
  useCreateSalesItem,
  useDeleteSalesItem,
  useDeleteSalesSimulationMonthly,
} from '../hooks/useSalesSimulation';
import { ItemInputData, ItemSnapshotData } from '../types/SalesSimulation';

interface SalesSimulationMonthlyEditorProps {
  projectId: string;
  yearMonth: string;
}

interface FormValues {
  items: ItemInputData[];
}

interface ItemRowProps {
  idx: number;
  fieldId: string;
  originalItem: ItemSnapshotData | undefined;
  control: Control<FormValues>;
  onDelete: (itemId: string, itemName: string) => void;
}

/**
 * 商品行コンポーネント。useWatch で計算方式を監視し、フィールドを条件分岐で表示する。
 */
function ItemRow({ idx, fieldId, originalItem, control, onDelete }: ItemRowProps) {
  const { t } = useTranslation();
  const calculationType = useWatch({ control, name: `items.${idx}.calculationType` });
  const isDaily = calculationType !== 'monthly';

  return (
    <TableRow key={fieldId}>
      <TableCell>
        <Box display="flex" alignItems="center" gap={1}>
          <Controller
            name={`items.${idx}.itemName`}
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                size="small"
                variant="outlined"
                sx={{ minWidth: '140px' }}
              />
            )}
          />
          {originalItem?.isInherited && (
            <Chip label={t('inherited_chip')} size="small" color="default" />
          )}
        </Box>
      </TableCell>
      <TableCell align="right">
        <Controller
          name={`items.${idx}.unitPrice`}
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              size="small"
              type="number"
              variant="outlined"
              inputProps={{ min: 0 }}
              sx={{ maxWidth: '100px' }}
              onChange={e => field.onChange(Number(e.target.value))}
            />
          )}
        />
      </TableCell>
      <TableCell align="center">
        <Controller
          name={`items.${idx}.calculationType`}
          control={control}
          render={({ field }) => (
            <ToggleButtonGroup
              value={field.value}
              exclusive
              onChange={(_e, val) => {
                if (val !== null) field.onChange(val);
              }}
              size="small"
              aria-label={t('calc_type')}
            >
              <ToggleButton value="daily" aria-label={t('calc_type_daily')}>
                {t('calc_type_daily')}
              </ToggleButton>
              <ToggleButton value="monthly" aria-label={t('calc_type_monthly')}>
                {t('calc_type_monthly')}
              </ToggleButton>
            </ToggleButtonGroup>
          )}
        />
      </TableCell>
      <TableCell align="right">
        {isDaily ? (
          <Controller
            name={`items.${idx}.quantity`}
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                size="small"
                type="number"
                variant="outlined"
                inputProps={{ min: 0 }}
                sx={{ maxWidth: '80px' }}
                onChange={e => field.onChange(Number(e.target.value))}
              />
            )}
          />
        ) : (
          <Typography variant="body2" color="text.secondary">—</Typography>
        )}
      </TableCell>
      <TableCell align="right">
        {isDaily ? (
          <Controller
            name={`items.${idx}.operatingDays`}
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                size="small"
                type="number"
                variant="outlined"
                inputProps={{ min: 0 }}
                sx={{ maxWidth: '80px' }}
                onChange={e => field.onChange(Number(e.target.value))}
              />
            )}
          />
        ) : (
          <Typography variant="body2" color="text.secondary">—</Typography>
        )}
      </TableCell>
      <TableCell align="right">
        {!isDaily ? (
          <Controller
            name={`items.${idx}.monthlyQuantity`}
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                size="small"
                type="number"
                variant="outlined"
                inputProps={{ min: 0 }}
                sx={{ maxWidth: '90px' }}
                onChange={e => field.onChange(Number(e.target.value))}
              />
            )}
          />
        ) : (
          <Typography variant="body2" color="text.secondary">—</Typography>
        )}
      </TableCell>
      <TableCell align="right">
        <Controller
          name={`items.${idx}.costRate`}
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              size="small"
              type="number"
              variant="outlined"
              inputProps={{ min: 0, max: 100, step: 0.1 }}
              sx={{ maxWidth: '80px' }}
              onChange={e => field.onChange(Number(e.target.value))}
            />
          )}
        />
      </TableCell>
      <TableCell align="right">
        {originalItem?.monthlySales.toLocaleString() ?? '-'}
      </TableCell>
      <TableCell align="right">
        {originalItem?.monthlyCost.toLocaleString() ?? '-'}
      </TableCell>
      <TableCell align="center">
        <Tooltip title={t('delete_item')}>
          <IconButton
            size="small"
            color="error"
            onClick={() => onDelete(
              originalItem?.itemId ?? '',
              originalItem?.itemName ?? '',
            )}
            aria-label={t('delete_item')}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </TableCell>
    </TableRow>
  );
}

/**
 * 指定月の売上シミュレーションをカテゴリ別アコーディオンで表示・編集するコンポーネント。
 * カテゴリ・アイテムの追加・削除も行える。
 */
export default function SalesSimulationMonthlyEditor({
  projectId,
  yearMonth,
}: SalesSimulationMonthlyEditorProps) {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useSalesSimulationMonthly(projectId, yearMonth);
  const mutation = useUpdateSalesSimulation(projectId);
  const deleteMutation = useDeleteSalesSimulationMonthly(projectId);
  const createCategoryMutation = useCreateSalesCategory(projectId);
  const updateCategoryMutation = useUpdateSalesCategory(projectId);
  const deleteCategoryMutation = useDeleteSalesCategory(projectId);
  const createItemMutation = useCreateSalesItem(projectId);
  const deleteItemMutation = useDeleteSalesItem(projectId);

  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryOrder, setNewCategoryOrder] = useState<number | ''>('');
  const [addingCategory, setAddingCategory] = useState(false);
  /** カテゴリごとの優先度編集中の値（categoryId -> 入力中の値） */
  const [editingOrders, setEditingOrders] = useState<Record<string, number | ''>>({});
  /** カテゴリごとの新規アイテム名入力状態 */
  const [newItemNames, setNewItemNames] = useState<Record<string, string>>({});

  const { control, handleSubmit, reset } = useForm<FormValues>({ defaultValues: { items: [] } });
  const { fields } = useFieldArray({ control, name: 'items' });

  useEffect(() => {
    if (data) {
      const flat: ItemInputData[] = data.categories.flatMap(cat =>
        cat.items.map(item => ({
          itemId: item.itemId,
          categoryId: cat.categoryId,
          categoryName: cat.categoryName,
          categoryOrder: cat.categoryOrder,
          itemName: item.itemName,
          itemOrder: item.itemOrder,
          unitPrice: item.unitPrice,
          quantity: item.quantity,
          operatingDays: item.operatingDays,
          costRate: item.costRate,
          description: item.description,
          calculationType: item.calculationType ?? 'daily',
          monthlyQuantity: item.monthlyQuantity ?? 0,
        })),
      );
      reset({ items: flat });
    }
  }, [data, reset]);

  const onSubmit = (values: FormValues) => {
    mutation.mutate({ yearMonth, items: values.items });
  };

  /** この月の登録を削除する */
  const handleDeleteMonthly = () => {
    if (!window.confirm(t('confirm_delete_monthly_data'))) return;
    deleteMutation.mutate({ yearMonth });
  };

  /** カテゴリを追加する */
  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return;
    createCategoryMutation.mutate(
      {
        categoryName: newCategoryName.trim(),
        categoryOrder: typeof newCategoryOrder === 'number' ? newCategoryOrder : undefined,
      },
      {
        onSuccess: () => {
          setNewCategoryName('');
          setNewCategoryOrder('');
          setAddingCategory(false);
        },
      },
    );
  };

  /** カテゴリの優先度をサーバーに保存する */
  const handleSaveCategoryOrder = (categoryId: string, currentOrder: number) => {
    const editing = editingOrders[categoryId];
    const newOrder = typeof editing === 'number' ? editing : currentOrder;
    if (newOrder === currentOrder) return;
    updateCategoryMutation.mutate({ categoryId, categoryOrder: newOrder });
  };

  /** カテゴリを削除する */
  const handleDeleteCategory = (categoryId: string, categoryName: string) => {    if (!window.confirm(t('confirm_delete_category', { name: categoryName }))) return;
    deleteCategoryMutation.mutate({ categoryId });
  };

  /** アイテムを追加する */
  const handleAddItem = (categoryId: string) => {
    const name = (newItemNames[categoryId] ?? '').trim();
    if (!name) return;
    createItemMutation.mutate(
      { categoryId, itemName: name },
      {
        onSuccess: () => {
          setNewItemNames(prev => ({ ...prev, [categoryId]: '' }));
        },
      },
    );
  };

  /** アイテムを削除する */
  const handleDeleteItem = (itemId: string, itemName: string) => {
    if (!window.confirm(t('confirm_delete_item', { name: itemName }))) return;
    deleteItemMutation.mutate({ itemId });
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" mt={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (isError || !data) {
    return <Alert severity="error">{t('load_error')}</Alert>;
  }
  const categoryGroups = data.categories.map(cat => ({
    ...cat,
    fieldIndices: fields.reduce<number[]>((acc, f, idx) => {
      if (f.categoryId === cat.categoryId) acc.push(idx);
      return acc;
    }, []),
  }));

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit)}>
      {data.isInherited && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {t('inherited_info_sales')}
        </Alert>
      )}

      {categoryGroups.map(cat => (
        <Accordion key={cat.categoryId} defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box
              display="flex"
              alignItems="center"
              justifyContent="space-between"
              width="100%"
              pr={1}
            >
              <Typography fontWeight="bold">{cat.categoryName}</Typography>
              <Box display="flex" alignItems="center" gap={1}>
                <Tooltip title={t('priority')}>
                  <TextField
                    size="small"
                    type="number"
                    label={t('priority')}
                    value={
                      editingOrders[cat.categoryId] !== undefined
                        ? editingOrders[cat.categoryId]
                        : cat.categoryOrder
                    }
                    onChange={e => {
                      const v = e.target.value;
                      setEditingOrders(prev => ({
                        ...prev,
                        [cat.categoryId]: v === '' ? '' : parseInt(v, 10),
                      }));
                    }}
                    onBlur={() => handleSaveCategoryOrder(cat.categoryId, cat.categoryOrder)}
                    onKeyDown={e => {
                      e.stopPropagation();
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSaveCategoryOrder(cat.categoryId, cat.categoryOrder);
                      }
                    }}
                    onClick={e => e.stopPropagation()}
                    inputProps={{ min: 0, step: 1 }}
                    sx={{ width: 90 }}
                    aria-label={t('priority')}
                  />
                </Tooltip>
                <Tooltip title={t('delete_category')}>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={e => {
                      e.stopPropagation();
                      handleDeleteCategory(cat.categoryId, cat.categoryName);
                    }}
                    aria-label={t('delete_category')}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          </AccordionSummary>
          <AccordionDetails sx={{ p: 0 }}>
            <Paper variant="outlined" square>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ backgroundColor: 'grey.100' }}>
                    <TableCell>{t('item_name')}</TableCell>
                    <TableCell align="right">{t('unit_price')}</TableCell>
                    <TableCell align="center">{t('calc_type')}</TableCell>
                    <TableCell align="right">{t('quantity')}</TableCell>
                    <TableCell align="right">{t('operating_days')}</TableCell>
                    <TableCell align="right">{t('monthly_quantity')}</TableCell>
                    <TableCell align="right">{t('cost_rate')}</TableCell>
                    <TableCell align="right">{t('monthly_sales_col')}</TableCell>
                    <TableCell align="right">{t('monthly_cost_col')}</TableCell>
                    <TableCell align="center">{t('action')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {cat.fieldIndices.map(idx => {
                    const originalItem = cat.items.find(
                      it => it.itemId === fields[idx]?.itemId,
                    );
                    return (
                      <ItemRow
                        key={fields[idx]?.id ?? idx}
                        idx={idx}
                        fieldId={fields[idx]?.id ?? String(idx)}
                        originalItem={originalItem}
                        control={control}
                        onDelete={handleDeleteItem}
                      />
                    );
                  })}
                  {/* 新規品目追加行 */}
                  <TableRow>
                    <TableCell colSpan={10}>
                      <Box display="flex" alignItems="center" gap={1} p={0.5}>
                        <TextField
                          size="small"
                          placeholder={t('new_item_name_placeholder')}
                          value={newItemNames[cat.categoryId] ?? ''}
                          onChange={e =>
                            setNewItemNames(prev => ({
                              ...prev,
                              [cat.categoryId]: e.target.value,
                            }))
                          }
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddItem(cat.categoryId);
                            }
                          }}
                          sx={{ minWidth: '200px' }}
                          aria-label={t('new_item_name_placeholder')}
                        />
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<AddIcon />}
                          type="button"
                          onClick={() => handleAddItem(cat.categoryId)}
                          disabled={createItemMutation.isPending}
                        >
                          {t('add_item')}
                        </Button>
                      </Box>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </Paper>
          </AccordionDetails>
        </Accordion>
      ))}

      {/* カテゴリ追加エリア */}
      <Paper variant="outlined" sx={{ mt: 2, p: 2 }}>
        {addingCategory ? (
          <Box display="flex" alignItems="center" gap={1}>
            <TextField
              size="small"
              placeholder={t('new_category_name_placeholder')}
              value={newCategoryName}
              onChange={e => setNewCategoryName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddCategory();
                }
                if (e.key === 'Escape') setAddingCategory(false);
              }}
              autoFocus
              aria-label={t('new_category_name_placeholder')}
            />
            <TextField
              size="small"
              type="number"
              label={t('priority')}
              value={newCategoryOrder}
              onChange={e =>
                setNewCategoryOrder(e.target.value === '' ? '' : parseInt(e.target.value, 10))
              }
              inputProps={{ min: 0, step: 1 }}
              sx={{ width: 100 }}
              aria-label={t('priority')}
            />
            <Button
              size="small"
              variant="contained"
              type="button"
              onClick={handleAddCategory}
              disabled={createCategoryMutation.isPending}
            >
              {t('add')}
            </Button>
            <Button size="small" onClick={() => setAddingCategory(false)}>{t('cancel')}</Button>
          </Box>
        ) : (
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            type="button"
            onClick={() => setAddingCategory(true)}
            size="small"
          >
            {t('add_category')}
          </Button>
        )}
      </Paper>

      <Paper variant="outlined" sx={{ mt: 2, p: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="body2" color="text.secondary">
              {t('monthly_sales_total', { amount: data.monthlyTotal.toLocaleString() })}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('monthly_cost_total', { amount: data.monthlyCost.toLocaleString() })}
            </Typography>
          </Box>
          <Box display="flex" gap={1}>
            {!data.isInherited && (
              <Button
                variant="outlined"
                color="error"
                onClick={handleDeleteMonthly}
                disabled={deleteMutation.isPending}
              >
                {t('delete_monthly_data')}
              </Button>
            )}
            <Button
              type="submit"
              variant="contained"
              startIcon={<SaveIcon />}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? t('saving') : t('save')}
            </Button>
          </Box>
        </Box>
        {mutation.isError && (
          <Alert severity="error" sx={{ mt: 1 }}>{t('save_error')}</Alert>
        )}
        {mutation.isSuccess && (
          <Alert severity="success" sx={{ mt: 1 }}>{t('save_success')}</Alert>
        )}
        {deleteMutation.isError && (
          <Alert severity="error" sx={{ mt: 1 }}>{t('delete_error')}</Alert>
        )}
        {deleteMutation.isSuccess && (
          <Alert severity="success" sx={{ mt: 1 }}>{t('delete_success')}</Alert>
        )}
      </Paper>
    </Box>
  );
}
