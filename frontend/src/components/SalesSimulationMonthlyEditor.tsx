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
  Tooltip,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SaveIcon from '@mui/icons-material/Save';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { useFieldArray, useForm, Controller } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import {
  useSalesSimulationMonthly,
  useUpdateSalesSimulation,
  useCreateSalesCategory,
  useDeleteSalesCategory,
  useCreateSalesItem,
  useDeleteSalesItem,
} from '../hooks/useSalesSimulation';
import { ItemInputData } from '../types/SalesSimulation';

interface SalesSimulationMonthlyEditorProps {
  projectId: string;
  yearMonth: string;
}

interface FormValues {
  items: ItemInputData[];
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
  const createCategoryMutation = useCreateSalesCategory(projectId);
  const deleteCategoryMutation = useDeleteSalesCategory(projectId);
  const createItemMutation = useCreateSalesItem(projectId);
  const deleteItemMutation = useDeleteSalesItem(projectId);

  const [newCategoryName, setNewCategoryName] = useState('');
  const [addingCategory, setAddingCategory] = useState(false);
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
        })),
      );
      reset({ items: flat });
    }
  }, [data, reset]);

  const onSubmit = (values: FormValues) => {
    mutation.mutate({ yearMonth, items: values.items });
  };

  /** カテゴリを追加する */
  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return;
    createCategoryMutation.mutate(
      { categoryName: newCategoryName.trim() },
      {
        onSuccess: () => {
          setNewCategoryName('');
          setAddingCategory(false);
        },
      },
    );
  };

  /** カテゴリを削除する */
  const handleDeleteCategory = (categoryId: string, categoryName: string) => {
    if (!window.confirm(`カテゴリ「${categoryName}」と配下の品目をすべて削除しますか？`)) return;
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
    if (!window.confirm(`品目「${itemName}」を削除しますか？`)) return;
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
    return <Alert severity="error">データの読み込みに失敗しました。</Alert>;
  }

  /** フォームのフラット配列からカテゴリ別インデックスを構築 */
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
              <Tooltip title="カテゴリを削除">
                <IconButton
                  size="small"
                  color="error"
                  onClick={e => {
                    e.stopPropagation();
                    handleDeleteCategory(cat.categoryId, cat.categoryName);
                  }}
                  aria-label={`カテゴリ ${cat.categoryName} を削除`}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </AccordionSummary>
          <AccordionDetails sx={{ p: 0 }}>
            <Paper variant="outlined" square>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ backgroundColor: 'grey.100' }}>
                    <TableCell>品目名</TableCell>
                    <TableCell align="right">単価</TableCell>
                    <TableCell align="right">数量</TableCell>
                    <TableCell align="right">稼働日数</TableCell>
                    <TableCell align="right">原価率 (%)</TableCell>
                    <TableCell align="right">月間売上</TableCell>
                    <TableCell align="right">月間原価</TableCell>
                    <TableCell align="center">操作</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {cat.fieldIndices.map(idx => {
                    const originalItem = cat.items.find(
                      it => it.itemId === fields[idx]?.itemId,
                    );
                    return (
                      <TableRow key={fields[idx]?.id ?? idx}>
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
                              <Chip label="継承" size="small" color="default" />
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
                        <TableCell align="right">
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
                        </TableCell>
                        <TableCell align="right">
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
                          <Tooltip title="品目を削除">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() =>
                                handleDeleteItem(
                                  fields[idx]?.itemId ?? '',
                                  fields[idx]?.itemName ?? '',
                                )
                              }
                              aria-label={`品目 ${fields[idx]?.itemName ?? ''} を削除`}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {/* 新規品目追加行 */}
                  <TableRow>
                    <TableCell colSpan={8}>
                      <Box display="flex" alignItems="center" gap={1} p={0.5}>
                        <TextField
                          size="small"
                          placeholder="新しい品目名"
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
                          aria-label="新しい品目名"
                        />
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<AddIcon />}
                          type="button"
                          onClick={() => handleAddItem(cat.categoryId)}
                          disabled={createItemMutation.isPending}
                        >
                          品目を追加
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
              placeholder="新しいカテゴリ名"
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
              aria-label="新しいカテゴリ名"
            />
            <Button
              size="small"
              variant="contained"
              type="button"
              onClick={handleAddCategory}
              disabled={createCategoryMutation.isPending}
            >
              追加
            </Button>
            <Button size="small" onClick={() => setAddingCategory(false)}>キャンセル</Button>
          </Box>
        ) : (
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            type="button"
            onClick={() => setAddingCategory(true)}
            size="small"
          >
            カテゴリを追加
          </Button>
        )}
      </Paper>

      <Paper variant="outlined" sx={{ mt: 2, p: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="body2" color="text.secondary">
              月間売上合計: {data.monthlyTotal.toLocaleString()} 円
            </Typography>
            <Typography variant="body2" color="text.secondary">
              月間原価合計: {data.monthlyCost.toLocaleString()} 円
            </Typography>
          </Box>
          <Button
            type="submit"
            variant="contained"
            startIcon={<SaveIcon />}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? '保存中...' : '保存'}
          </Button>
        </Box>
        {mutation.isError && (
          <Alert severity="error" sx={{ mt: 1 }}>保存に失敗しました。</Alert>
        )}
        {mutation.isSuccess && (
          <Alert severity="success" sx={{ mt: 1 }}>保存しました。</Alert>
        )}
      </Paper>
    </Box>
  );
}
