import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useTranslation } from 'react-i18next';
import { useFixedAssets, useCreateFixedAsset, useUpdateFixedAsset, useDeleteFixedAsset } from '../hooks/useFixedAssets';
import { FixedAsset, FixedAssetInputData } from '../types/FixedAsset';
import FixedAssetDialog from './FixedAssetDialog';

interface Props {
  projectId: string;
}

/**
 * 固定資産マスター管理コンポーネント。
 * 資産の一覧表示・追加・編集・削除を行う。
 */
export default function FixedAssetManager({ projectId }: Props) {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useFixedAssets(projectId);
  const createMutation = useCreateFixedAsset(projectId);
  const updateMutation = useUpdateFixedAsset(projectId);
  const deleteMutation = useDeleteFixedAsset(projectId);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<FixedAsset | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FixedAsset | null>(null);
  const [snackOpen, setSnackOpen] = useState(false);
  const [snackError, setSnackError] = useState(false);
  const [snackMessage, setSnackMessage] = useState('');

  const showSnack = (message: string, isError = false) => {
    setSnackMessage(message);
    setSnackError(isError);
    setSnackOpen(true);
  };

  const handleAdd = () => {
    setEditTarget(null);
    setDialogOpen(true);
  };

  const handleEdit = (asset: FixedAsset) => {
    setEditTarget(asset);
    setDialogOpen(true);
  };

  const handleSave = (formData: FixedAssetInputData) => {
    if (editTarget) {
      updateMutation.mutate(
        { assetId: editTarget.id, data: formData },
        {
          onSuccess: () => {
            setDialogOpen(false);
            showSnack(t('fixed_asset_save_success'));
          },
          onError: () => showSnack(t('fixed_asset_save_error'), true),
        },
      );
    } else {
      createMutation.mutate(formData, {
        onSuccess: () => {
          setDialogOpen(false);
          showSnack(t('fixed_asset_save_success'));
        },
        onError: () => showSnack(t('fixed_asset_save_error'), true),
      });
    }
  };

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        setDeleteTarget(null);
        showSnack(t('fixed_asset_delete_success'));
      },
      onError: () => {
        setDeleteTarget(null);
        showSnack(t('fixed_asset_delete_error'), true);
      },
    });
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

  const assets = data?.assets ?? [];

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">{t('fixed_asset_list')}</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleAdd}>
          {t('add_fixed_asset')}
        </Button>
      </Box>

      {assets.length === 0 ? (
        <Typography color="text.secondary">{t('no_fixed_assets')}</Typography>
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: 'grey.100' }}>
              <TableCell>{t('asset_name')}</TableCell>
              <TableCell>{t('asset_category')}</TableCell>
              <TableCell>{t('purchase_date')}</TableCell>
              <TableCell align="right">{t('purchase_amount')}</TableCell>
              <TableCell>{t('useful_life')}</TableCell>
              <TableCell>{t('depreciation_method')}</TableCell>
              <TableCell align="right">{t('monthly_depreciation_amount')}</TableCell>
              <TableCell>{t('end_depreciation_date')}</TableCell>
              <TableCell>{t('action')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {assets.map(asset => (
              <TableRow key={asset.id} hover>
                <TableCell>{asset.assetName}</TableCell>
                <TableCell>{t(`asset_category_${asset.assetCategory}`)}</TableCell>
                <TableCell>{asset.purchaseDate}</TableCell>
                <TableCell align="right">{Number(asset.purchaseAmount).toLocaleString()}</TableCell>
                <TableCell>{asset.usefulLife}{t('years_unit')}</TableCell>
                <TableCell>{t(`depreciation_method_${asset.depreciationMethod}`)}</TableCell>
                <TableCell align="right">{Number(asset.monthlyDepreciation).toLocaleString()}</TableCell>
                <TableCell>{asset.endDepreciationDate}</TableCell>
                <TableCell>
                  <Tooltip title={t('edit_fixed_asset')}>
                    <IconButton size="small" onClick={() => handleEdit(asset)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={t('delete_fixed_asset')}>
                    <IconButton size="small" onClick={() => setDeleteTarget(asset)} color="error">
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* 登録・編集ダイアログ */}
      <FixedAssetDialog
        open={dialogOpen}
        asset={editTarget}
        onClose={() => setDialogOpen(false)}
        onSave={handleSave}
        isSaving={createMutation.isPending || updateMutation.isPending}
      />

      {/* 削除確認ダイアログ */}
      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>{t('delete_fixed_asset')}</DialogTitle>
        <DialogContent>
          <Typography>{t('confirm_delete_fixed_asset')}</Typography>
          {deleteTarget && (
            <Typography fontWeight="bold" mt={1}>{deleteTarget.assetName}</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>{t('cancel')}</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDeleteConfirm}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? t('saving') : t('delete_fixed_asset')}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackOpen}
        autoHideDuration={3000}
        onClose={() => setSnackOpen(false)}
      >
        <Alert severity={snackError ? 'error' : 'success'} onClose={() => setSnackOpen(false)}>
          {snackMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
