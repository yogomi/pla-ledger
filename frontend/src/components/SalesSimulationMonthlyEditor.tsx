import React, { useEffect, useState, useMemo } from 'react';
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

interface CategoryInfo {
  categoryId: string;
  categoryName: string;
  categoryOrder: number;
}

interface ItemRowProps {
  idx: number;
  fieldId: string;
  originalItem: ItemSnapshotData | undefined;
  control: Control<FormValues>;
  onDelete: (idx: number, itemName: string) => void;
}

/**
 * 商品行コンポーネント。useWatch で入力値を監視し、月間売上・原価をリアルタイム計算して表示する。
 */
function ItemRow({ idx, fieldId, originalItem, control, onDelete }: ItemRowProps) {
  const { t } = useTranslation();
  const calculationType = useWatch({ control, name: `items.${idx}.calculationType` });
  const unitPrice = useWatch({ control, name: `items.${idx}.unitPrice` }) ?? 0;
  const quantity = useWatch({ control, name: `items.${idx}.quantity` }) ?? 0;
  const operatingDays = useWatch({ control, name: `items.${idx}.operatingDays` }) ?? 0;
  const costRate = useWatch({ control, name: `items.${idx}.costRate` }) ?? 0;
  const monthlyQuantity = useWatch({ control, name: `items.${idx}.monthlyQuantity` }) ?? 0;

  const isDaily = calculationType !== 'monthly';

  const monthlySales = isDaily
    ? unitPrice * quantity * operatingDays
    : unitPrice * monthlyQuantity;
  const monthlyCost = monthlySales * (costRate / 100);

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
        {Math.round(monthlySales).toLocaleString()}
      </TableCell>
      <TableCell align="right">
        {Math.round(monthlyCost).toLocaleString()}
      </TableCell>
      <TableCell align="center">
        <Tooltip title={t('delete_item')}>
          <IconButton
            size="small"
            color="error"
            onClick={() => onDelete(idx, originalItem?.itemName ?? '')}
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
 * スナップショットを正とし、マスタには依存しない。
 * カテゴリ・アイテムの追加・削除はスナップショットに対して直接行う。
 */
export default function SalesSimulationMonthlyEditor({
  projectId,
  yearMonth,
}: SalesSimulationMonthlyEditorProps) {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useSalesSimulationMonthly(projectId, yearMonth);
  const mutation = useUpdateSalesSimulation(projectId);
  const deleteMutation = useDeleteSalesSimulationMonthly(projectId);

  // カテゴリ一覧をローカル状態で管理する（マスタAPIではなくスナップショットに直接反映）
  const [categories, setCategories] = useState<CategoryInfo[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryOrder, setNewCategoryOrder] = useState<number | ''>('');
  const [addingCategory, setAddingCategory] = useState(false);
  const [editingOrders, setEditingOrders] = useState<Record<string, number | ''>>({});
  const [newItemNames, setNewItemNames] = useState<Record<string, string>>({});

  const { control, handleSubmit, reset, getValues, setValue } = useForm<FormValues>({
    defaultValues: { items: [] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const watchedItems = useWatch({ control, name: 'items' }) ?? [];

  // APIレスポンスでフォームとカテゴリ一覧を初期化する
  useEffect(() => {
    if (data) {
      setCategories(data.categories.map(cat => ({
        categoryId: cat.categoryId,
        categoryName: cat.categoryName,
        categoryOrder: cat.categoryOrder,
      })));

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

  const handleDeleteMonthly = () => {
    if (!window.confirm(t('confirm_delete_monthly_data'))) return;
    deleteMutation.mutate({ yearMonth });
  };

  /** カテゴリをスナップショットに追加する（マスタAPIを使わない） */
  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return;
    const categoryId = crypto.randomUUID();
    const order = typeof newCategoryOrder === 'number'
      ? newCategoryOrder
      : (categories.length > 0 ? Math.max(...categories.map(c => c.categoryOrder)) + 1 : 0);
    setCategories(prev => [...prev, {
      categoryId,
      categoryName: newCategoryName.trim(),
      categoryOrder: order,
    }]);
    setNewCategoryName('');
    setNewCategoryOrder('');
    setAddingCategory(false);
  };

  /** カテゴリの表示順をフォームアイテムに反映する */
  const handleSaveCategoryOrder = (categoryId: string, currentOrder: number) => {
    const editing = editingOrders[categoryId];
    const newOrder = typeof editing === 'number' ? editing : currentOrder;
    if (newOrder === currentOrder) return;

    setCategories(prev => prev.map(c =>
      c.categoryId === categoryId ? { ...c, categoryOrder: newOrder } : c,
    ));

    // フォーム内の全アイテムの categoryOrder を更新する
    const currentItems = getValues('items');
    currentItems.forEach((item, idx) => {
      if (item.categoryId === categoryId) {
        setValue(`items.${idx}.categoryOrder`, newOrder);
      }
    });
  };

  /** カテゴリとその配下のアイテムをスナップショットから除去する */
  const handleDeleteCategory = (categoryId: string, categoryName: string) => {
    if (!window.confirm(t('confirm_delete_category', { name: categoryName }))) return;
    setCategories(prev => prev.filter(c => c.categoryId !== categoryId));

    // このカテゴリに属するアイテムのインデックスを逆順で削除する
    const indicesToRemove = fields.reduce<number[]>((acc, f, idx) => {
      if (f.categoryId === categoryId) acc.push(idx);
      return acc;
    }, []);
    for (const idx of [...indicesToRemove].reverse()) {
      remove(idx);
    }
  };

  /** アイテムをスナップショットに直接追加する（マスタAPIを使わない） */
  const handleAddItem = (cat: CategoryInfo) => {
    const name = (newItemNames[cat.categoryId] ?? '').trim();
    if (!name) return;

    const catFields = fields.filter(f => f.categoryId === cat.categoryId);
    const maxOrder = catFields.reduce((max, f) => Math.max(max, f.itemOrder), -1);

    append({
      itemId: crypto.randomUUID(),
      categoryId: cat.categoryId,
      categoryName: cat.categoryName,
      categoryOrder: cat.categoryOrder,
      itemName: name,
      itemOrder: maxOrder + 1,
      unitPrice: 0,
      quantity: 0,
      operatingDays: 0,
      costRate: 0,
      description: null,
      calculationType: 'daily',
      monthlyQuantity: 0,
    });

    setNewItemNames(prev => ({ ...prev, [cat.categoryId]: '' }));
  };

  /** アイテムをフォームから除去する（スナップショット保存時に反映される） */
  const handleDeleteItem = (idx: number, itemName: string) => {
    if (!window.confirm(t('confirm_delete_item', { name: itemName }))) return;
    remove(idx);
  };

  // カテゴリを order 順に並べ、各カテゴリに属するフィールドインデックスを付与する
  const categoryGroups = useMemo(() =>
    [...categories]
      .sort((a, b) => a.categoryOrder - b.categoryOrder)
      .map(cat => ({
        ...cat,
        fieldIndices: fields.reduce<number[]>((acc, f, idx) => {
          if (f.categoryId === cat.categoryId) acc.push(idx);
          return acc;
        }, []),
      })),
    [categories, fields],
  );

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
                    const originalItem = data.categories
                      .find(c => c.categoryId === cat.categoryId)
                      ?.items.find(it => it.itemId === fields[idx]?.itemId);
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
                              handleAddItem(cat);
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
                          onClick={() => handleAddItem(cat)}
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
            {(() => {
              let totalSales = 0;
              let totalCost = 0;
              for (const item of watchedItems) {
                const sales = item.calculationType === 'monthly'
                  ? (item.unitPrice ?? 0) * (item.monthlyQuantity ?? 0)
                  : (item.unitPrice ?? 0) * (item.quantity ?? 0) * (item.operatingDays ?? 0);
                totalSales += sales;
                totalCost += sales * ((item.costRate ?? 0) / 100);
              }
              return (
                <>
                  <Typography variant="body2" color="text.secondary">
                    {t('monthly_sales_total', { amount: Math.round(totalSales).toLocaleString() })}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('monthly_cost_total', { amount: Math.round(totalCost).toLocaleString() })}
                  </Typography>
                </>
              );
            })()}
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
