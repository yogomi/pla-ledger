import React, { useEffect } from 'react';
import {
  Alert,
  Box,
  Button,
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
import SaveIcon from '@mui/icons-material/Save';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { useFieldArray, useForm, Controller } from 'react-hook-form';
import {
  useExpenseSimulationMonthly,
  useUpdateFixedExpenses,
  useUpdateVariableExpenses,
} from '../hooks/useSalesSimulation';
import { ExpenseInputItem } from '../types/SalesSimulation';

interface ExpenseMonthlyEditorProps {
  projectId: string;
  yearMonth: string;
}

interface FixedFormValues {
  expenses: ExpenseInputItem[];
}

interface VariableFormValues {
  expenses: ExpenseInputItem[];
}

/**
 * 固定費テーブルの編集フォームコンポーネント。
 * 行の追加・削除ができる。
 */
function FixedExpenseForm({
  projectId,
  yearMonth,
  defaultExpenses,
}: {
  projectId: string;
  yearMonth: string;
  defaultExpenses: ExpenseInputItem[];
}) {
  const mutation = useUpdateFixedExpenses(projectId);
  const { control, handleSubmit, reset } = useForm<FixedFormValues>({
    defaultValues: { expenses: defaultExpenses },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'expenses' });

  useEffect(() => {
    reset({ expenses: defaultExpenses });
  }, [defaultExpenses, reset]);

  const onSubmit = (values: FixedFormValues) => {
    mutation.mutate({ yearMonth, expenses: values.expenses });
  };

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit)}>
      <Table size="small">
        <TableHead>
          <TableRow sx={{ backgroundColor: 'grey.100' }}>
            <TableCell>カテゴリ名</TableCell>
            <TableCell align="right">月額</TableCell>
            <TableCell>備考</TableCell>
            <TableCell align="center">操作</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {fields.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} align="center">
                <Typography variant="body2" color="text.secondary">項目なし</Typography>
              </TableCell>
            </TableRow>
          )}
          {fields.map((field, idx) => (
            <TableRow key={field.id}>
              <TableCell>
                <Controller
                  name={`expenses.${idx}.categoryName`}
                  control={control}
                  render={({ field: f }) => (
                    <TextField {...f} size="small" variant="outlined" sx={{ minWidth: '160px' }} />
                  )}
                />
              </TableCell>
              <TableCell align="right">
                <Controller
                  name={`expenses.${idx}.amount`}
                  control={control}
                  render={({ field: f }) => (
                    <TextField
                      {...f}
                      size="small"
                      type="number"
                      variant="outlined"
                      inputProps={{ min: 0 }}
                      sx={{ maxWidth: '120px' }}
                      onChange={e => f.onChange(Number(e.target.value))}
                    />
                  )}
                />
              </TableCell>
              <TableCell>
                <Controller
                  name={`expenses.${idx}.description`}
                  control={control}
                  render={({ field: f }) => (
                    <TextField
                      {...f}
                      size="small"
                      variant="outlined"
                      value={f.value ?? ''}
                      sx={{ minWidth: '180px' }}
                    />
                  )}
                />
              </TableCell>
              <TableCell align="center">
                <Tooltip title="行を削除">
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => remove(idx)}
                    aria-label="行を削除"
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Box display="flex" justifyContent="space-between" alignItems="center" p={1} gap={1}>
        <Button
          size="small"
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={() => append({ categoryName: '', amount: 0, description: null })}
        >
          行を追加
        </Button>
        <Button
          type="submit"
          variant="contained"
          size="small"
          startIcon={<SaveIcon />}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? '保存中...' : '保存'}
        </Button>
      </Box>
      {mutation.isError && <Alert severity="error">固定費の保存に失敗しました。</Alert>}
      {mutation.isSuccess && <Alert severity="success">固定費を保存しました。</Alert>}
    </Box>
  );
}

/**
 * 変動費テーブルの編集フォームコンポーネント。
 * 行の追加・削除ができる。
 */
function VariableExpenseForm({
  projectId,
  yearMonth,
  defaultExpenses,
}: {
  projectId: string;
  yearMonth: string;
  defaultExpenses: ExpenseInputItem[];
}) {
  const mutation = useUpdateVariableExpenses(projectId);
  const { control, handleSubmit, reset } = useForm<VariableFormValues>({
    defaultValues: { expenses: defaultExpenses },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'expenses' });

  useEffect(() => {
    reset({ expenses: defaultExpenses });
  }, [defaultExpenses, reset]);

  const onSubmit = (values: VariableFormValues) => {
    mutation.mutate({ yearMonth, expenses: values.expenses });
  };

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit)}>
      <Table size="small">
        <TableHead>
          <TableRow sx={{ backgroundColor: 'grey.100' }}>
            <TableCell>カテゴリ名</TableCell>
            <TableCell align="right">月額</TableCell>
            <TableCell>備考</TableCell>
            <TableCell align="center">操作</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {fields.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} align="center">
                <Typography variant="body2" color="text.secondary">項目なし</Typography>
              </TableCell>
            </TableRow>
          )}
          {fields.map((field, idx) => (
            <TableRow key={field.id}>
              <TableCell>
                <Controller
                  name={`expenses.${idx}.categoryName`}
                  control={control}
                  render={({ field: f }) => (
                    <TextField {...f} size="small" variant="outlined" sx={{ minWidth: '160px' }} />
                  )}
                />
              </TableCell>
              <TableCell align="right">
                <Controller
                  name={`expenses.${idx}.amount`}
                  control={control}
                  render={({ field: f }) => (
                    <TextField
                      {...f}
                      size="small"
                      type="number"
                      variant="outlined"
                      inputProps={{ min: 0 }}
                      sx={{ maxWidth: '120px' }}
                      onChange={e => f.onChange(Number(e.target.value))}
                    />
                  )}
                />
              </TableCell>
              <TableCell>
                <Controller
                  name={`expenses.${idx}.description`}
                  control={control}
                  render={({ field: f }) => (
                    <TextField
                      {...f}
                      size="small"
                      variant="outlined"
                      value={f.value ?? ''}
                      sx={{ minWidth: '180px' }}
                    />
                  )}
                />
              </TableCell>
              <TableCell align="center">
                <Tooltip title="行を削除">
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => remove(idx)}
                    aria-label="行を削除"
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Box display="flex" justifyContent="space-between" alignItems="center" p={1} gap={1}>
        <Button
          size="small"
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={() => append({ categoryName: '', amount: 0, description: null })}
        >
          行を追加
        </Button>
        <Button
          type="submit"
          variant="contained"
          size="small"
          startIcon={<SaveIcon />}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? '保存中...' : '保存'}
        </Button>
      </Box>
      {mutation.isError && <Alert severity="error">変動費の保存に失敗しました。</Alert>}
      {mutation.isSuccess && <Alert severity="success">変動費を保存しました。</Alert>}
    </Box>
  );
}

/**
 * 指定月の固定費・変動費を表示・編集し、損益サマリーを表示するコンポーネント。
 */
export default function ExpenseMonthlyEditor({
  projectId,
  yearMonth,
}: ExpenseMonthlyEditorProps) {
  const { data, isLoading, isError } = useExpenseSimulationMonthly(projectId, yearMonth);

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

  const fixedExpenses: ExpenseInputItem[] = data.fixedExpenses.map(e => ({
    categoryName: e.categoryName,
    amount: e.amount,
    description: e.description,
  }));

  const variableExpenses: ExpenseInputItem[] = data.variableExpenses.map(e => ({
    categoryName: e.categoryName,
    amount: e.amount,
    description: e.description,
  }));

  return (
    <Box display="flex" flexDirection="column" gap={3}>
      {/* 固定費セクション */}
      <Paper variant="outlined">
        <Box p={2} borderBottom={1} borderColor="divider">
          <Typography variant="h6">固定費</Typography>
        </Box>
        <FixedExpenseForm
          projectId={projectId}
          yearMonth={yearMonth}
          defaultExpenses={fixedExpenses}
        />
      </Paper>

      {/* 変動費セクション */}
      <Paper variant="outlined">
        <Box p={2} borderBottom={1} borderColor="divider">
          <Typography variant="h6">変動費</Typography>
        </Box>
        <VariableExpenseForm
          projectId={projectId}
          yearMonth={yearMonth}
          defaultExpenses={variableExpenses}
        />
      </Paper>

      {/* 損益サマリー */}
      <Paper variant="outlined">
        <Box p={2}>
          <Typography variant="h6" gutterBottom>損益サマリー</Typography>
          <Table size="small">
            <TableBody>
              <TableRow>
                <TableCell>売上</TableCell>
                <TableCell align="right">{data.monthlySales.toLocaleString()} 円</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>原価</TableCell>
                <TableCell align="right">{data.monthlyCost.toLocaleString()} 円</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>固定費合計</TableCell>
                <TableCell align="right">{data.fixedTotal.toLocaleString()} 円</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>変動費合計</TableCell>
                <TableCell align="right">{data.variableTotal.toLocaleString()} 円</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>経費合計</TableCell>
                <TableCell align="right">{data.totalExpense.toLocaleString()} 円</TableCell>
              </TableRow>
              <TableRow sx={{ backgroundColor: 'grey.50' }}>
                <TableCell><Typography fontWeight="bold">営業利益</Typography></TableCell>
                <TableCell align="right">
                  <Typography
                    fontWeight="bold"
                    color={data.operatingProfit >= 0 ? 'success.main' : 'error.main'}
                  >
                    {data.operatingProfit.toLocaleString()} 円
                  </Typography>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Box>
      </Paper>
    </Box>
  );
}
