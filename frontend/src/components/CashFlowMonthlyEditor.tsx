import React, { useState, useEffect, useMemo } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  CircularProgress,
  Snackbar,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { useTranslation } from 'react-i18next';
import { useCashFlowMonthly, useUpdateCashFlow } from '../hooks/useCashFlow';
import { getCashFlowMonthly } from '../api/cashFlow';
import { CashFlowInputData } from '../types/CashFlow';

const DEFAULT_FORM: CashFlowInputData = {
  depreciation: 0,
  accountsReceivableChange: 0,
  inventoryChange: 0,
  accountsPayableChange: 0,
  otherOperating: 0,
  capexAcquisition: 0,
  assetSale: 0,
  intangibleAcquisition: 0,
  otherInvesting: 0,
  capitalIncrease: 0,
  dividendPayment: 0,
  otherFinancing: 0,
  cashBeginning: 0,
  noteJa: '',
  noteEn: '',
};

/**
 * 月次キャッシュフロー入力コンポーネント。
 * 手入力項目を編集し、自動連携項目は読み取り専用で表示する。
 */
export default function CashFlowMonthlyEditor({
  projectId,
  yearMonth,
}: {
  projectId: string;
  yearMonth: string;
}) {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useCashFlowMonthly(projectId, yearMonth);
  const updateMutation = useUpdateCashFlow(projectId);
  const [formData, setFormData] = useState<CashFlowInputData>(DEFAULT_FORM);
  const [noteTab, setNoteTab] = useState(0);
  const [snackOpen, setSnackOpen] = useState(false);
  const [snackError, setSnackError] = useState(false);
  const [isCopying, setIsCopying] = useState(false);

  // データ取得後にフォームへ反映
  useEffect(() => {
    if (data) {
      setFormData({
        depreciation: data.operating.depreciation,
        accountsReceivableChange: data.operating.accountsReceivableChange,
        inventoryChange: data.operating.inventoryChange,
        accountsPayableChange: data.operating.accountsPayableChange,
        otherOperating: data.operating.otherOperating,
        capexAcquisition: data.investing.capexAcquisition,
        assetSale: data.investing.assetSale,
        intangibleAcquisition: data.investing.intangibleAcquisition,
        otherInvesting: data.investing.otherInvesting,
        capitalIncrease: data.financing.capitalIncrease,
        dividendPayment: data.financing.dividendPayment,
        otherFinancing: data.financing.otherFinancing,
        cashBeginning: data.summary.cashBeginning,
        noteJa: data.notes.ja ?? '',
        noteEn: data.notes.en ?? '',
      });
    }
  }, [data]);

  // 小計・合計のリアルタイム計算
  const calculatedValues = useMemo(() => {
    const profitBeforeTax = data?.operating.profitBeforeTax ?? 0;
    const interestExpense = data?.operating.interestExpense ?? 0;
    const borrowingProceeds = data?.financing.borrowingProceeds ?? 0;
    const loanRepayment = data?.financing.loanRepayment ?? 0;

    const operatingSubtotal =
      profitBeforeTax
      + formData.depreciation
      - interestExpense
      + formData.accountsReceivableChange
      + formData.inventoryChange
      + formData.accountsPayableChange
      + formData.otherOperating;

    const investingSubtotal =
      formData.capexAcquisition
      + formData.assetSale
      + formData.intangibleAcquisition
      + formData.otherInvesting;

    const financingSubtotal =
      borrowingProceeds
      + loanRepayment
      + formData.capitalIncrease
      + formData.dividendPayment
      + formData.otherFinancing;

    const netCashChange = operatingSubtotal + investingSubtotal + financingSubtotal;
    const cashBeginning = formData.cashBeginning ?? 0;
    const cashEnding = cashBeginning + netCashChange;

    return { operatingSubtotal, investingSubtotal, financingSubtotal, netCashChange, cashEnding };
  }, [formData, data]);

  const handleChange = (field: keyof CashFlowInputData, value: string) => {
    if (field === 'noteJa' || field === 'noteEn') {
      setFormData(prev => ({ ...prev, [field]: value }));
    } else {
      setFormData(prev => ({ ...prev, [field]: parseFloat(value) || 0 }));
    }
  };

  const handleSave = () => {
    updateMutation.mutate(
      { yearMonth, data: formData },
      {
        onSuccess: () => {
          setSnackError(false);
          setSnackOpen(true);
        },
        onError: () => {
          setSnackError(true);
          setSnackOpen(true);
        },
      },
    );
  };

  /**
   * 前月の手入力値をフォームにコピーする。
   * 前月の CF レコードを取得し、手動調整項目（減価償却費・設備投資等）とメモを現在のフォームに反映する。
   * 取得失敗時は何もしない（エラーをサイレントに無視）。
   */
  const handleCopyFromPreviousMonth = async () => {
    const [year, month] = yearMonth.split('-').map(Number);
    const prevDate = new Date(year, month - 2, 1);
    const prevYearMonth =
      `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
    setIsCopying(true);
    try {
      const prev = await getCashFlowMonthly(projectId, prevYearMonth);
      setFormData(current => ({
        ...current,
        depreciation: prev.operating.depreciation,
        accountsReceivableChange: prev.operating.accountsReceivableChange,
        inventoryChange: prev.operating.inventoryChange,
        accountsPayableChange: prev.operating.accountsPayableChange,
        otherOperating: prev.operating.otherOperating,
        capexAcquisition: prev.investing.capexAcquisition,
        assetSale: prev.investing.assetSale,
        intangibleAcquisition: prev.investing.intangibleAcquisition,
        otherInvesting: prev.investing.otherInvesting,
        capitalIncrease: prev.financing.capitalIncrease,
        dividendPayment: prev.financing.dividendPayment,
        otherFinancing: prev.financing.otherFinancing,
        noteJa: prev.notes.ja ?? '',
        noteEn: prev.notes.en ?? '',
      }));
    } catch {
      setSnackError(true);
      setSnackOpen(true);
    } finally {
      setIsCopying(false);
    }
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

  return (
    <Box>
      <Box display="flex" justifyContent="flex-end" mb={2}>
        <Button
          variant="outlined"
          size="small"
          startIcon={<ContentCopyIcon />}
          onClick={() => void handleCopyFromPreviousMonth()}
          disabled={isCopying}
        >
          {t('copy_from_previous_month')}
        </Button>
      </Box>

      {/* 営業活動CF */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography fontWeight="bold">{t('operating_activities')}</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box display="flex" flexDirection="column" gap={2}>
            <TextField
              label={`${t('profit_before_tax')} ${t('auto_linked')}`}
              value={data?.operating.profitBeforeTax ?? 0}
              disabled
              size="small"
              inputProps={{ style: { backgroundColor: '#f5f5f5' } }}
            />
            <TextField
              label={t('depreciation')}
              type="number"
              value={formData.depreciation}
              onChange={e => handleChange('depreciation', e.target.value)}
              size="small"
            />
            <TextField
              label={`${t('interest_expense')} ${t('auto_linked')}`}
              value={data?.operating.interestExpense ?? 0}
              disabled
              size="small"
              inputProps={{ style: { backgroundColor: '#f5f5f5' } }}
            />
            <TextField
              label={t('accounts_receivable_change')}
              type="number"
              value={formData.accountsReceivableChange}
              onChange={e => handleChange('accountsReceivableChange', e.target.value)}
              size="small"
            />
            <TextField
              label={t('inventory_change')}
              type="number"
              value={formData.inventoryChange}
              onChange={e => handleChange('inventoryChange', e.target.value)}
              size="small"
            />
            <TextField
              label={t('accounts_payable_change')}
              type="number"
              value={formData.accountsPayableChange}
              onChange={e => handleChange('accountsPayableChange', e.target.value)}
              size="small"
            />
            <TextField
              label={t('other_operating')}
              type="number"
              value={formData.otherOperating}
              onChange={e => handleChange('otherOperating', e.target.value)}
              size="small"
            />
            <Typography variant="subtitle1" fontWeight="bold">
              {t('subtotal')}: {calculatedValues.operatingSubtotal.toLocaleString()}
            </Typography>
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* 投資活動CF */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography fontWeight="bold">{t('investing_activities')}</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box display="flex" flexDirection="column" gap={2}>
            <TextField
              label={t('capex_acquisition')}
              type="number"
              value={formData.capexAcquisition}
              onChange={e => handleChange('capexAcquisition', e.target.value)}
              size="small"
            />
            <TextField
              label={t('asset_sale')}
              type="number"
              value={formData.assetSale}
              onChange={e => handleChange('assetSale', e.target.value)}
              size="small"
            />
            <TextField
              label={t('intangible_acquisition')}
              type="number"
              value={formData.intangibleAcquisition}
              onChange={e => handleChange('intangibleAcquisition', e.target.value)}
              size="small"
            />
            <TextField
              label={t('other_investing')}
              type="number"
              value={formData.otherInvesting}
              onChange={e => handleChange('otherInvesting', e.target.value)}
              size="small"
            />
            <Typography variant="subtitle1" fontWeight="bold">
              {t('subtotal')}: {calculatedValues.investingSubtotal.toLocaleString()}
            </Typography>
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* 財務活動CF */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography fontWeight="bold">{t('financing_activities')}</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box display="flex" flexDirection="column" gap={2}>
            <TextField
              label={`${t('borrowing_proceeds')} ${t('auto_linked')}`}
              value={data?.financing.borrowingProceeds ?? 0}
              disabled
              size="small"
              inputProps={{ style: { backgroundColor: '#f5f5f5' } }}
            />
            <TextField
              label={`${t('loan_repayment')} ${t('auto_linked')}`}
              value={data?.financing.loanRepayment ?? 0}
              disabled
              size="small"
              inputProps={{ style: { backgroundColor: '#f5f5f5' } }}
            />
            <TextField
              label={t('capital_increase')}
              type="number"
              value={formData.capitalIncrease}
              onChange={e => handleChange('capitalIncrease', e.target.value)}
              size="small"
            />
            <TextField
              label={t('dividend_payment')}
              type="number"
              value={formData.dividendPayment}
              onChange={e => handleChange('dividendPayment', e.target.value)}
              size="small"
            />
            <TextField
              label={t('other_financing')}
              type="number"
              value={formData.otherFinancing}
              onChange={e => handleChange('otherFinancing', e.target.value)}
              size="small"
            />
            <Typography variant="subtitle1" fontWeight="bold">
              {t('subtotal')}: {calculatedValues.financingSubtotal.toLocaleString()}
            </Typography>
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* 期首残高 */}
      <Box mt={2}>
        <TextField
          label={t('cash_beginning')}
          type="number"
          value={formData.cashBeginning ?? 0}
          onChange={e => handleChange('cashBeginning', e.target.value)}
          size="small"
          sx={{ mr: 2 }}
        />
      </Box>

      {/* サマリー */}
      <Box mt={2} p={2} border={1} borderColor="divider" borderRadius={1}>
        <Typography variant="h6">
          {t('net_cash_change')}: {calculatedValues.netCashChange.toLocaleString()}
        </Typography>
        <Typography>
          {t('cash_ending')}: {calculatedValues.cashEnding.toLocaleString()}
        </Typography>
      </Box>

      {/* 備考タブ */}
      <Box mt={2}>
        <Tabs value={noteTab} onChange={(_e, v: number) => setNoteTab(v)}>
          <Tab label="日本語" />
          <Tab label="English" />
        </Tabs>
        {noteTab === 0 && (
          <TextField
            label={t('notes')}
            value={formData.noteJa ?? ''}
            onChange={e => handleChange('noteJa', e.target.value)}
            multiline
            rows={3}
            fullWidth
            sx={{ mt: 1 }}
          />
        )}
        {noteTab === 1 && (
          <TextField
            label={t('notes')}
            value={formData.noteEn ?? ''}
            onChange={e => handleChange('noteEn', e.target.value)}
            multiline
            rows={3}
            fullWidth
            sx={{ mt: 1 }}
          />
        )}
      </Box>

      <Box mt={2}>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={updateMutation.isPending}
        >
          {updateMutation.isPending ? t('saving') : t('save')}
        </Button>
      </Box>

      <Snackbar
        open={snackOpen}
        autoHideDuration={3000}
        onClose={() => setSnackOpen(false)}
      >
        <Alert severity={snackError ? 'error' : 'success'} onClose={() => setSnackOpen(false)}>
          {snackError ? t('save_error') : t('save_success')}
        </Alert>
      </Snackbar>
    </Box>
  );
}
