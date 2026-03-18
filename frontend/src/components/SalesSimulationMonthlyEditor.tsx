import React, { useEffect } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SaveIcon from '@mui/icons-material/Save';
import { useFieldArray, useForm, Controller } from 'react-hook-form';
import { useSalesSimulationMonthly, useUpdateSalesSimulation } from '../hooks/useSalesSimulation';
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
 */
export default function SalesSimulationMonthlyEditor({
  projectId,
  yearMonth,
}: SalesSimulationMonthlyEditorProps) {
  const { data, isLoading, isError } = useSalesSimulationMonthly(projectId, yearMonth);
  const mutation = useUpdateSalesSimulation(projectId);

  const { control, handleSubmit, reset } = useForm<FormValues>({ defaultValues: { items: [] } });
  const { fields } = useFieldArray({ control, name: 'items' });

  useEffect(() => {
    if (data) {
      const flat: ItemInputData[] = data.categories.flatMap(cat =>
        cat.items.map(item => ({
          itemId: item.itemId,
          categoryId: item.categoryId,
          categoryName: item.categoryName,
          categoryOrder: item.categoryOrder,
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
          このデータは前月から継承されています。
        </Alert>
      )}

      {categoryGroups.map(cat => (
        <Accordion key={cat.categoryId} defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography fontWeight="bold">{cat.categoryName}</Typography>
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
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Paper>
          </AccordionDetails>
        </Accordion>
      ))}

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
