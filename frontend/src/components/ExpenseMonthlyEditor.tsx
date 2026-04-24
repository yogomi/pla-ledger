import { useEffect } from 'react';
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
import { useTranslation } from 'react-i18next';
import {
  useExpenseSimulationMonthly,
  useUpdateFixedExpenses,
  useDeleteFixedExpenses,
} from '../hooks/useSalesSimulation';
import { ExpenseInputItem } from '../types/SalesSimulation';
import LaborCostMonthlyEditor from './LaborCostMonthlyEditor';

interface ExpenseMonthlyEditorProps {
  projectId: string;
  yearMonth: string;
}

interface FixedFormValues {
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
  isInherited,
}: {
  projectId: string;
  yearMonth: string;
  defaultExpenses: ExpenseInputItem[];
  isInherited: boolean;
}) {
  const { t } = useTranslation();
  const mutation = useUpdateFixedExpenses(projectId);
  const deleteMutation = useDeleteFixedExpenses(projectId);
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

  /** この月の固定費登録を削除する */
  const handleDeleteMonthly = () => {
    if (!window.confirm(t('confirm_delete_monthly_data'))) return;
    deleteMutation.mutate({ yearMonth });
  };

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit)}>
      <Table size="small">
        <TableHead>
          <TableRow sx={{ backgroundColor: 'grey.100' }}>
            <TableCell>{t('category_name_col')}</TableCell>
            <TableCell align="right">{t('monthly_amount')}</TableCell>
            <TableCell>{t('notes')}</TableCell>
            <TableCell align="center">{t('action')}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {fields.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} align="center">
                <Typography variant="body2" color="text.secondary">{t('no_items')}</Typography>
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
                <Tooltip title={t('delete_row')}>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => remove(idx)}
                    aria-label={t('delete_row')}
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
          {t('add_row')}
        </Button>
        <Box display="flex" gap={1}>
          {!isInherited && (
            <Button
              size="small"
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
            size="small"
            startIcon={<SaveIcon />}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? t('saving') : t('save')}
          </Button>
        </Box>
      </Box>
      {mutation.isError && <Alert severity="error">{t('fixed_save_error')}</Alert>}
      {mutation.isSuccess && <Alert severity="success">{t('fixed_save_success')}</Alert>}
      {deleteMutation.isError && <Alert severity="error">{t('delete_error')}</Alert>}
      {deleteMutation.isSuccess && <Alert severity="success">{t('delete_success')}</Alert>}
    </Box>
  );
}

/**
 * 指定月の固定費を表示・編集し、損益サマリーを表示するコンポーネント。
 */
export default function ExpenseMonthlyEditor({
  projectId,
  yearMonth,
}: ExpenseMonthlyEditorProps) {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useExpenseSimulationMonthly(projectId, yearMonth);

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

  const fixedExpenses: ExpenseInputItem[] = data.fixedExpenses.map(e => ({
    categoryName: e.categoryName,
    amount: e.amount,
    description: e.description,
  }));

  return (
    <Box display="flex" flexDirection="column" gap={3}>
      {data.isInherited && (
        <Alert severity="info">
          {t('inherited_info_expense')}
        </Alert>
      )}

      {/* 固定費セクション */}
      <Paper variant="outlined">
        <Box p={2} borderBottom={1} borderColor="divider">
          <Typography variant="h6">{t('fixed_expenses_section')}</Typography>
        </Box>
        <FixedExpenseForm
          projectId={projectId}
          yearMonth={yearMonth}
          defaultExpenses={fixedExpenses}
          isInherited={data.isInherited}
        />
      </Paper>

      {/* 人件費セクション */}
      <Paper variant="outlined">
        <Box p={2} borderBottom={1} borderColor="divider">
          <Typography variant="h6">{t('labor_cost_section')}</Typography>
        </Box>
        <Box p={1}>
          <LaborCostMonthlyEditor projectId={projectId} yearMonth={yearMonth} />
        </Box>
      </Paper>

      {/* 損益サマリー */}
      <Paper variant="outlined">
        <Box p={2}>
          <Typography variant="h6" gutterBottom>{t('profit_loss_summary')}</Typography>
          <Table size="small">
            <TableBody>
              <TableRow>
                <TableCell>{t('sales_row')}</TableCell>
                <TableCell align="right">{Math.round(data.monthlySales).toLocaleString()} 円</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>{t('cost_row')}</TableCell>
                <TableCell align="right">{Math.round(data.monthlyCost).toLocaleString()} 円</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>{t('fixed_total_row')}</TableCell>
                <TableCell align="right">{Math.round(data.fixedTotal).toLocaleString()} 円</TableCell>
              </TableRow>
              {(data.laborByType ?? []).map(lb => (
                <TableRow key={lb.type}>
                  <TableCell sx={{ pl: 3 }}>
                    {t(lb.type as Parameters<typeof t>[0])}
                  </TableCell>
                  <TableCell align="right">
                    {Math.round(lb.amount).toLocaleString()} 円
                  </TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell>{t('labor_cost_section')}</TableCell>
                <TableCell align="right">{Math.round(data.laborTotal).toLocaleString()} 円</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>{t('expense_total_row')}</TableCell>
                <TableCell align="right">{Math.round(data.totalExpense).toLocaleString()} 円</TableCell>
              </TableRow>
              <TableRow sx={{ backgroundColor: 'grey.50' }}>
                <TableCell><Typography fontWeight="bold">{t('operating_profit')}</Typography></TableCell>
                <TableCell align="right">
                  <Typography
                    fontWeight="bold"
                    color={data.operatingProfit >= 0 ? 'success.main' : 'error.main'}
                  >
                    {Math.round(data.operatingProfit).toLocaleString()} 円
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
