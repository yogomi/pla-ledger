import React, { useEffect } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormHelperText,
  FormLabel,
  Radio,
  RadioGroup,
  TextField,
} from '@mui/material';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { useCreateLoan, useUpdateLoan } from '../hooks/useLoan';
import { Loan } from '../types/Loan';

/** フォームのバリデーションスキーマ */
const loanFormSchema = z.object({
  lenderName: z.string().min(1),
  principalAmount: z.preprocess(
    v => (v === '' ? undefined : Number(v)),
    z.number().positive(),
  ),
  interestRate: z.preprocess(
    v => (v === '' ? undefined : Number(v)),
    z.number().min(0).max(100),
  ),
  loanDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD'),
  repaymentStartDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD')
    .nullish(),
  repaymentMonths: z.preprocess(
    v => (v === '' ? undefined : Number(v)),
    z.number().int().positive(),
  ),
  repaymentMethod: z.enum(['equal_payment', 'equal_principal', 'bullet']),
  description: z.string().nullable().optional(),
});

type LoanFormData = z.infer<typeof loanFormSchema>;

interface LoanEditorDialogProps {
  projectId: string;
  open: boolean;
  onClose: () => void;
  /** 編集時は既存データを渡す。省略時は新規作成モード。 */
  loan?: Loan | null;
}

/**
 * 借入の作成・編集を行うダイアログコンポーネント。
 * MUI Dialog + react-hook-form + Zod バリデーション。
 */
export default function LoanEditorDialog({
  projectId,
  open,
  onClose,
  loan,
}: LoanEditorDialogProps) {
  const { t } = useTranslation();
  const createMutation = useCreateLoan(projectId);
  const updateMutation = useUpdateLoan(projectId);

  const isEdit = Boolean(loan);

  const { control, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<LoanFormData>({
    resolver: zodResolver(loanFormSchema),
    defaultValues: {
      lenderName: '',
      principalAmount: 0,
      interestRate: 0,
      loanDate: '',
      repaymentStartDate: null,
      repaymentMonths: 12,
      repaymentMethod: 'equal_payment',
      description: null,
    },
  });

  // ダイアログが開くたびにフォームを初期化する
  useEffect(() => {
    if (open) {
      reset(loan
        ? {
            lenderName: loan.lenderName,
            principalAmount: loan.principalAmount,
            interestRate: loan.interestRate,
            loanDate: loan.loanDate,
            repaymentStartDate: loan.repaymentStartDate,
            repaymentMonths: loan.repaymentMonths,
            repaymentMethod: loan.repaymentMethod,
            description: loan.description,
          }
        : {
            lenderName: '',
            principalAmount: 0,
            interestRate: 0,
            loanDate: '',
            repaymentStartDate: null,
            repaymentMonths: 12,
            repaymentMethod: 'equal_payment',
            description: null,
          },
      );
    }
  }, [open, loan, reset]);

  const onSubmit = async (data: LoanFormData) => {
    const payload = {
      lenderName: data.lenderName,
      principalAmount: Number(data.principalAmount),
      interestRate: Number(data.interestRate),
      loanDate: data.loanDate,
      repaymentStartDate: data.repaymentStartDate ?? null,
      repaymentMonths: Number(data.repaymentMonths),
      repaymentMethod: data.repaymentMethod,
      description: data.description ?? null,
    };

    if (isEdit && loan) {
      await updateMutation.mutateAsync({ loanId: loan.id, data: payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEdit ? t('edit_loan') : t('add_loan')}</DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* 借入先 */}
          <Controller
            name="lenderName"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label={t('lender_name')}
                error={Boolean(errors.lenderName)}
                helperText={errors.lenderName?.message}
                fullWidth
                required
              />
            )}
          />

          {/* 借入元本 */}
          <Controller
            name="principalAmount"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label={t('principal_amount')}
                type="number"
                inputProps={{ min: 0, step: 1 }}
                error={Boolean(errors.principalAmount)}
                helperText={errors.principalAmount?.message}
                fullWidth
                required
              />
            )}
          />

          {/* 金利 */}
          <Controller
            name="interestRate"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label={t('interest_rate')}
                type="number"
                inputProps={{ min: 0, max: 100, step: 0.01 }}
                error={Boolean(errors.interestRate)}
                helperText={errors.interestRate?.message}
                fullWidth
                required
              />
            )}
          />

          {/* 借入日 */}
          <Controller
            name="loanDate"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label={t('loan_date')}
                type="date"
                InputLabelProps={{ shrink: true }}
                error={Boolean(errors.loanDate)}
                helperText={errors.loanDate?.message}
                fullWidth
                required
              />
            )}
          />

          {/* 返済開始日（省略可） */}
          <Controller
            name="repaymentStartDate"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                value={field.value ?? ''}
                onChange={e => field.onChange(e.target.value || null)}
                label={t('repayment_start_date')}
                type="date"
                InputLabelProps={{ shrink: true }}
                error={Boolean(errors.repaymentStartDate)}
                helperText={
                  errors.repaymentStartDate?.message ?? t('repayment_start_date_hint')
                }
                fullWidth
              />
            )}
          />

          {/* 返済期間（月） */}
          <Controller
            name="repaymentMonths"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label={t('repayment_months')}
                type="number"
                inputProps={{ min: 1, step: 1 }}
                error={Boolean(errors.repaymentMonths)}
                helperText={errors.repaymentMonths?.message}
                fullWidth
                required
              />
            )}
          />

          {/* 返済方法 */}
          <Controller
            name="repaymentMethod"
            control={control}
            render={({ field }) => (
              <FormControl error={Boolean(errors.repaymentMethod)}>
                <FormLabel>{t('repayment_method')}</FormLabel>
                <RadioGroup {...field} row>
                  <FormControlLabel
                    value="equal_payment"
                    control={<Radio />}
                    label={t('equal_payment')}
                  />
                  <FormControlLabel
                    value="equal_principal"
                    control={<Radio />}
                    label={t('equal_principal')}
                  />
                  <FormControlLabel
                    value="bullet"
                    control={<Radio />}
                    label={t('bullet')}
                  />
                </RadioGroup>
                {errors.repaymentMethod && (
                  <FormHelperText>{errors.repaymentMethod.message}</FormHelperText>
                )}
              </FormControl>
            )}
          />

          {/* 備考 */}
          <Controller
            name="description"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                value={field.value ?? ''}
                label={t('loan_description')}
                multiline
                rows={2}
                error={Boolean(errors.description)}
                helperText={errors.description?.message}
                fullWidth
              />
            )}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={isSubmitting}>
            {t('cancel')}
          </Button>
          <Button type="submit" variant="contained" disabled={isSubmitting}>
            {isSubmitting ? t('saving') : t('save')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
