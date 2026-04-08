import React, { useState } from 'react';
import { Alert, Box, Button, TextField, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';

interface ProjectInitialCashBalanceProps {
  /** プロジェクトID */
  projectId: string;
  /** 現在の初期現金残高 */
  currentBalance: number;
  /** 通貨コード */
  currency: string;
  /** オーナー権限を持つかどうか */
  isOwner: boolean;
  /** 保存ハンドラ */
  onUpdate: (newBalance: number) => Promise<void>;
}

/**
 * プロジェクトの初期現金残高設定コンポーネント。
 * オーナーのみ編集可能。2025年1月時点の現金残高を設定する。
 */
export default function ProjectInitialCashBalance({
  currentBalance,
  currency,
  isOwner,
  onUpdate,
}: ProjectInitialCashBalanceProps) {
  const { t } = useTranslation();
  const [balance, setBalance] = useState(currentBalance);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      await onUpdate(balance);
    } catch {
      setError(t('initial_cash_balance_update_error'));
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
        {t('initial_cash_balance_setting')}
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        {t('initial_cash_balance_description')}
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
    </Box>
  );
}
