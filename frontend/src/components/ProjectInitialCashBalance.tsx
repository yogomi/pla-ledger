import React, { useState } from 'react';
import { Alert, Box, Button, Snackbar, TextField, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';

interface ProjectInitialCashBalanceProps {
  /** 現在の初期現金残高 */
  currentBalance: number;
  /** 通貨コード */
  currency: string;
  /** オーナー権限を持つかどうか */
  isOwner: boolean;
  /** 開業予定日（YYYY-MM形式、未設定の場合はnull） */
  plannedOpeningDate: string | null;
  /** 保存ハンドラ */
  onUpdate: (newBalance: number) => Promise<void>;
}

/**
 * プロジェクトの初期現金残高設定コンポーネント。
 * オーナーのみ編集可能。開業予定日時点の現金残高を設定する。
 */
export default function ProjectInitialCashBalance({
  currentBalance,
  currency,
  isOwner,
  plannedOpeningDate,
  onUpdate,
}: ProjectInitialCashBalanceProps) {
  const { t, i18n } = useTranslation();
  const [balance, setBalance] = useState(currentBalance);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorSnackOpen, setErrorSnackOpen] = useState(false);

  /** 表示用の開業予定日ラベル（例: ja→"2025年1月"、en→"January 2025"、未設定時は2025-01） */
  const dateLabel = (() => {
    const raw = plannedOpeningDate || '2025-01';
    const [year, month] = raw.split('-');
    const date = new Date(Number(year), Number(month) - 1, 1);
    if (i18n.language === 'ja') {
      return `${year}年${parseInt(month, 10)}月`;
    }
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
  })();

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setErrorSnackOpen(false);
    try {
      await onUpdate(balance);
    } catch {
      setError(t('initial_cash_balance_update_error'));
      setErrorSnackOpen(true);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOwner) {
    return (
      <Box>
        <Typography variant="body2">
          {t('initial_cash_balance')}: {Math.round(currentBalance).toLocaleString()} {currency}
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        {t('initial_cash_balance_setting', { date: dateLabel })}
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        {t('initial_cash_balance_description', { date: dateLabel })}
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Box display="flex" gap={2} alignItems="center">
        <TextField
          label={t('initial_cash_balance')}
          type="number"
          value={balance}
          onChange={(e) => setBalance(Number(e.target.value))}
          InputProps={{ endAdornment: currency }}
          size="small"
          disabled={isSaving}
        />
        <Button
          variant="contained"
          onClick={() => void handleSave()}
          disabled={isSaving || balance === currentBalance}
        >
          {isSaving ? t('saving') : t('save')}
        </Button>
      </Box>

      <Snackbar
        open={errorSnackOpen}
        autoHideDuration={6000}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        onClose={() => setErrorSnackOpen(false)}
      >
        <Alert severity="error" onClose={() => setErrorSnackOpen(false)}>
          {error}
        </Alert>
      </Snackbar>
    </Box>
  );
}
