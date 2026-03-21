import React, { useEffect } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
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
import { useLaborCostMonthly, useUpdateLaborCosts } from '../hooks/useLaborCost';
import { LaborCostInput, LaborCostType } from '../types/SalesSimulation';

interface LaborCostMonthlyEditorProps {
  projectId: string;
  yearMonth: string;
}

/** フォーム内の人件費行データ（各種別の全フィールドを含む） */
interface LaborCostFormRow {
  type: LaborCostType;
  ownerSalary: number;
  monthlySalary: number;
  employeeCount: number;
  bonusMonths: number;
  hourlyWage: number;
  hoursPerDay: number;
  daysPerMonth: number;
  partTimeCount: number;
}

interface LaborCostFormValues {
  rows: LaborCostFormRow[];
}

const DEFAULT_ROW: LaborCostFormRow = {
  type: 'owner_salary',
  ownerSalary: 0,
  monthlySalary: 0,
  employeeCount: 1,
  bonusMonths: 0,
  hourlyWage: 0,
  hoursPerDay: 0,
  daysPerMonth: 0,
  partTimeCount: 1,
};

/**
 * 月次合計をクライアント側でリアルタイム計算する（プレビュー用）。
 * 正確な値はバックエンドが保持する。
 */
function calcMonthlyPreview(row: LaborCostFormRow, socialInsuranceRate: number): number {
  if (row.type === 'owner_salary') {
    return row.ownerSalary || 0;
  }
  if (row.type === 'full_time') {
    const salary = row.monthlySalary || 0;
    const count = row.employeeCount || 0;
    const bonus = row.bonusMonths || 0;
    const monthlyBonus = salary * bonus / 12;
    const total = (salary + monthlyBonus) * count;
    return Math.round(total * (1 + socialInsuranceRate / 100));
  }
  if (row.type === 'part_time') {
    return Math.round(
      (row.hourlyWage || 0) *
      (row.hoursPerDay || 0) *
      (row.daysPerMonth || 0) *
      (row.partTimeCount || 0),
    );
  }
  return 0;
}

/**
 * 指定月の人件費を入力・編集するコンポーネント。
 */
export default function LaborCostMonthlyEditor({
  projectId,
  yearMonth,
}: LaborCostMonthlyEditorProps) {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useLaborCostMonthly(projectId, yearMonth);
  const mutation = useUpdateLaborCosts(projectId);

  const { control, handleSubmit, reset, watch } = useForm<LaborCostFormValues>({
    defaultValues: { rows: [] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'rows' });
  const rows = watch('rows');

  useEffect(() => {
    if (!data) return;
    const mapped: LaborCostFormRow[] = data.laborCosts.map(lc => ({
      type: lc.type,
      ownerSalary: lc.ownerSalary ?? 0,
      monthlySalary: lc.monthlySalary ?? 0,
      employeeCount: lc.employeeCount ?? 1,
      bonusMonths: lc.bonusMonths ?? 0,
      hourlyWage: lc.hourlyWage ?? 0,
      hoursPerDay: lc.hoursPerDay ?? 0,
      daysPerMonth: lc.daysPerMonth ?? 0,
      partTimeCount: lc.partTimeCount ?? 1,
    }));
    reset({ rows: mapped });
  }, [data, reset]);

  const socialInsuranceRate = data?.socialInsuranceRate ?? 15;

  const onSubmit = (values: LaborCostFormValues) => {
    const laborCosts: LaborCostInput[] = values.rows.map((row, idx) => {
      const base = { displayOrder: idx };
      if (row.type === 'owner_salary') {
        return { ...base, type: 'owner_salary' as const, ownerSalary: row.ownerSalary || 0 };
      }
      if (row.type === 'full_time') {
        return {
          ...base,
          type: 'full_time' as const,
          monthlySalary: row.monthlySalary || 0,
          employeeCount: row.employeeCount || 1,
          bonusMonths: row.bonusMonths || 0,
        };
      }
      // part_time
      return {
        ...base,
        type: 'part_time' as const,
        hourlyWage: row.hourlyWage || 0,
        hoursPerDay: row.hoursPerDay || 0,
        daysPerMonth: row.daysPerMonth || 0,
        partTimeCount: row.partTimeCount || 1,
      };
    });
    mutation.mutate({ yearMonth, laborCosts });
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" mt={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (isError) {
    return <Alert severity="error">{t('load_error')}</Alert>;
  }

  const previewTotal = rows.reduce(
    (sum, row) => sum + calcMonthlyPreview(row, socialInsuranceRate),
    0,
  );

  return (
    <Box>
      {data?.isInherited && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {t('inherited_info_labor_cost')}
        </Alert>
      )}

      <Box component="form" onSubmit={handleSubmit(onSubmit)}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: 'grey.100' }}>
              <TableCell sx={{ minWidth: 130 }}>{t('labor_cost_type')}</TableCell>
              <TableCell sx={{ minWidth: 400 }}>{t('labor_cost_input')}</TableCell>
              <TableCell align="right" sx={{ minWidth: 120 }}>
                {t('monthly_amount')}
              </TableCell>
              <TableCell align="center">{t('action')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {fields.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  <Typography variant="body2" color="text.secondary">
                    {t('no_items')}
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {fields.map((field, idx) => {
              const row = rows[idx];
              const preview = row ? calcMonthlyPreview(row, socialInsuranceRate) : 0;
              return (
                <TableRow key={field.id}>
                  {/* 種別セレクト */}
                  <TableCell>
                    <Controller
                      name={`rows.${idx}.type`}
                      control={control}
                      render={({ field: f }) => (
                        <FormControl size="small" fullWidth>
                          <Select {...f}>
                            <MenuItem value="owner_salary">{t('owner_salary')}</MenuItem>
                            <MenuItem value="full_time">{t('full_time')}</MenuItem>
                            <MenuItem value="part_time">{t('part_time')}</MenuItem>
                          </Select>
                        </FormControl>
                      )}
                    />
                  </TableCell>

                  {/* 種別に応じた入力フィールド */}
                  <TableCell>
                    <Box display="flex" gap={1} flexWrap="wrap" alignItems="center">
                      {row?.type === 'owner_salary' && (
                        <Controller
                          name={`rows.${idx}.ownerSalary`}
                          control={control}
                          render={({ field: f }) => (
                            <TextField
                              {...f}
                              label={t('owner_salary_monthly')}
                              size="small"
                              type="number"
                              inputProps={{ min: 0 }}
                              sx={{ width: 160 }}
                              InputProps={{
                                endAdornment: (
                                  <InputAdornment position="end">円</InputAdornment>
                                ),
                              }}
                              onChange={e => f.onChange(Number(e.target.value))}
                            />
                          )}
                        />
                      )}
                      {row?.type === 'full_time' && (
                        <>
                          <Controller
                            name={`rows.${idx}.monthlySalary`}
                            control={control}
                            render={({ field: f }) => (
                              <TextField
                                {...f}
                                label={t('monthly_salary')}
                                size="small"
                                type="number"
                                inputProps={{ min: 0 }}
                                sx={{ width: 150 }}
                                InputProps={{
                                  endAdornment: (
                                    <InputAdornment position="end">円</InputAdornment>
                                  ),
                                }}
                                onChange={e => f.onChange(Number(e.target.value))}
                              />
                            )}
                          />
                          <Controller
                            name={`rows.${idx}.employeeCount`}
                            control={control}
                            render={({ field: f }) => (
                              <TextField
                                {...f}
                                label={t('employee_count')}
                                size="small"
                                type="number"
                                inputProps={{ min: 1 }}
                                sx={{ width: 80 }}
                                InputProps={{
                                  endAdornment: (
                                    <InputAdornment position="end">名</InputAdornment>
                                  ),
                                }}
                                onChange={e => f.onChange(Number(e.target.value))}
                              />
                            )}
                          />
                          <Controller
                            name={`rows.${idx}.bonusMonths`}
                            control={control}
                            render={({ field: f }) => (
                              <TextField
                                {...f}
                                label={t('bonus_months')}
                                size="small"
                                type="number"
                                inputProps={{ min: 0, step: 0.1 }}
                                sx={{ width: 100 }}
                                InputProps={{
                                  endAdornment: (
                                    <InputAdornment position="end">ヶ月</InputAdornment>
                                  ),
                                }}
                                onChange={e => f.onChange(Number(e.target.value))}
                              />
                            )}
                          />
                        </>
                      )}
                      {row?.type === 'part_time' && (
                        <>
                          <Controller
                            name={`rows.${idx}.hourlyWage`}
                            control={control}
                            render={({ field: f }) => (
                              <TextField
                                {...f}
                                label={t('hourly_wage')}
                                size="small"
                                type="number"
                                inputProps={{ min: 0 }}
                                sx={{ width: 110 }}
                                InputProps={{
                                  endAdornment: (
                                    <InputAdornment position="end">円</InputAdornment>
                                  ),
                                }}
                                onChange={e => f.onChange(Number(e.target.value))}
                              />
                            )}
                          />
                          <Controller
                            name={`rows.${idx}.hoursPerDay`}
                            control={control}
                            render={({ field: f }) => (
                              <TextField
                                {...f}
                                label={t('hours_per_day')}
                                size="small"
                                type="number"
                                inputProps={{ min: 0, step: 0.5 }}
                                sx={{ width: 100 }}
                                InputProps={{
                                  endAdornment: (
                                    <InputAdornment position="end">h</InputAdornment>
                                  ),
                                }}
                                onChange={e => f.onChange(Number(e.target.value))}
                              />
                            )}
                          />
                          <Controller
                            name={`rows.${idx}.daysPerMonth`}
                            control={control}
                            render={({ field: f }) => (
                              <TextField
                                {...f}
                                label={t('days_per_month')}
                                size="small"
                                type="number"
                                inputProps={{ min: 0 }}
                                sx={{ width: 80 }}
                                InputProps={{
                                  endAdornment: (
                                    <InputAdornment position="end">日</InputAdornment>
                                  ),
                                }}
                                onChange={e => f.onChange(Number(e.target.value))}
                              />
                            )}
                          />
                          <Controller
                            name={`rows.${idx}.partTimeCount`}
                            control={control}
                            render={({ field: f }) => (
                              <TextField
                                {...f}
                                label={t('part_time_count')}
                                size="small"
                                type="number"
                                inputProps={{ min: 0, step: 0.1 }}
                                sx={{ width: 80 }}
                                InputProps={{
                                  endAdornment: (
                                    <InputAdornment position="end">名</InputAdornment>
                                  ),
                                }}
                                onChange={e => f.onChange(Number(e.target.value))}
                              />
                            )}
                          />
                        </>
                      )}
                    </Box>
                  </TableCell>

                  {/* 月次合計プレビュー */}
                  <TableCell align="right">
                    <Typography variant="body2">
                      {preview.toLocaleString()} 円
                    </Typography>
                  </TableCell>

                  {/* 削除ボタン */}
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
              );
            })}

            {/* 合計行 */}
            {fields.length > 0 && (
              <TableRow sx={{ backgroundColor: 'grey.50' }}>
                <TableCell colSpan={2}>
                  <Typography variant="body2" fontWeight="bold">
                    {t('total_labor_cost')}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" fontWeight="bold">
                    {previewTotal.toLocaleString()} 円
                  </Typography>
                </TableCell>
                <TableCell />
              </TableRow>
            )}
          </TableBody>
        </Table>

        <Box display="flex" justifyContent="space-between" alignItems="center" p={1} gap={1}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => append({ ...DEFAULT_ROW })}
          >
            {t('add_labor_cost_row')}
          </Button>
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

        {mutation.isError && (
          <Alert severity="error">{t('labor_cost_save_error')}</Alert>
        )}
        {mutation.isSuccess && (
          <Alert severity="success">{t('labor_cost_save_success')}</Alert>
        )}
      </Box>
    </Box>
  );
}
