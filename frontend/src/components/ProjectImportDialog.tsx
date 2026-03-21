import React, { useState, useRef } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Typography, Box, Alert, CircularProgress, Paper,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

interface ExportData {
  version: string;
  exportedAt: string;
  project: {
    title: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

/**
 * プロジェクトインポートダイアログ
 *
 * - JSONファイルを選択し、エクスポートデータをプレビュー表示する
 * - プロジェクト名は任意で上書き可能（空欄時はエクスポートデータのタイトルを使用）
 * - インポート成功後、新しいプロジェクト詳細ページへ遷移する
 */
export default function ProjectImportDialog({ open, onClose }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [exportData, setExportData] = useState<ExportData | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [error, setError] = useState('');
  const [importing, setImporting] = useState(false);

  /** ダイアログを閉じる際に状態をリセットする */
  const handleClose = () => {
    setExportData(null);
    setNewTitle('');
    setError('');
    onClose();
  };

  /** JSONファイル選択時の処理 */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }
    setError('');
    setExportData(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        // エクスポートデータの基本構造チェック
        if (!parsed.version || !parsed.project || !parsed.exportedAt) {
          setError(t('import_error'));
          return;
        }
        setExportData(parsed as ExportData);
      } catch {
        setError(t('import_error'));
      }
    };
    reader.readAsText(file);

    // 同じファイルを再選択できるようにリセット
    e.target.value = '';
  };

  /** インポート実行 */
  const handleImport = async () => {
    if (!exportData) {
      return;
    }
    setImporting(true);
    setError('');
    try {
      const body: { data: ExportData; newTitle?: string } = { data: exportData };
      if (newTitle.trim()) {
        body.newTitle = newTitle.trim();
      }
      const res = await api.post('/projects/import', body);
      const projectId = res.data.data.projectId as string;
      handleClose();
      navigate(`/projects/${projectId}?tab=project`);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { code?: string; message?: string } } };
      const code = axiosErr.response?.data?.code;
      if (code === 'duplicate_project_name') {
        setError(t('import_duplicate_name'));
      } else if (code === 'unsupported_version') {
        setError(t('import_unsupported_version'));
      } else {
        setError(axiosErr.response?.data?.message ?? t('import_error'));
      }
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t('import_project_dialog_title')}</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {/* ファイル選択 */}
        <Box mb={2}>
          <input
            type="file"
            accept=".json,application/json"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
          <Button
            variant="outlined"
            startIcon={<UploadFileIcon />}
            onClick={() => fileInputRef.current?.click()}
          >
            {t('import_select_file')}
          </Button>
        </Box>

        {/* プレビュー */}
        {exportData && (
          <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>{t('import_preview')}</Typography>
            <Typography variant="body2">
              {t('import_original_title')}: <strong>{exportData.project.title}</strong>
            </Typography>
            <Typography variant="body2">
              {t('import_exported_at')}: {new Date(exportData.exportedAt).toLocaleString()}
            </Typography>
          </Paper>
        )}

        {/* プロジェクト名入力 */}
        <TextField
          label={t('import_project_name')}
          helperText={t('import_project_name_hint')}
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
          fullWidth
          disabled={!exportData}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={importing}>{t('cancel')}</Button>
        <Button
          variant="contained"
          onClick={handleImport}
          disabled={!exportData || importing}
          startIcon={importing ? <CircularProgress size={16} /> : undefined}
        >
          {importing ? t('saving') : t('import_button')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
