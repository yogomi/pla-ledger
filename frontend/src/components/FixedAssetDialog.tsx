import React, { useState, useEffect } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { FixedAsset, FixedAssetInputData, AssetCategory, DepreciationMethod } from '../types/FixedAsset';

const ASSET_CATEGORIES: AssetCategory[] = [
  'building',
  'equipment',
  'vehicle',
  'intangible',
  'other',
];

const DEPRECIATION_METHODS: DepreciationMethod[] = ['straight_line', 'diminishing'];

const DEFAULT_FORM: FixedAssetInputData = {
  assetName: '',
  assetCategory: 'equipment',
  purchaseDate: '',
  purchaseAmount: 0,
  usefulLife: 5,
  salvageValue: 0,
  depreciationMethod: 'straight_line',
  startDepreciationDate: '',
  notes: '',
};

interface Props {
  open: boolean;
  asset?: FixedAsset | null;
  onClose: () => void;
  onSave: (data: FixedAssetInputData) => void;
  isSaving?: boolean;
}

/**
 * 固定資産の登録・編集ダイアログ。
 */
export default function FixedAssetDialog({ open, asset, onClose, onSave, isSaving }: Props) {
  const { t } = useTranslation();
  const [form, setForm] = useState<FixedAssetInputData>(DEFAULT_FORM);

  useEffect(() => {
    if (asset) {
      setForm({
        assetName: asset.assetName,
        assetCategory: asset.assetCategory,
        purchaseDate: asset.purchaseDate,
        purchaseAmount: asset.purchaseAmount,
        usefulLife: asset.usefulLife,
        salvageValue: asset.salvageValue,
        depreciationMethod: asset.depreciationMethod,
        startDepreciationDate: asset.startDepreciationDate,
        notes: asset.notes ?? '',
      });
    } else {
      setForm(DEFAULT_FORM);
    }
  }, [asset, open]);

  const handleChange = (field: keyof FixedAssetInputData, value: string | number) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    onSave({
      ...form,
      purchaseAmount: Number(form.purchaseAmount),
      usefulLife: Number(form.usefulLife),
      salvageValue: Number(form.salvageValue),
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {asset ? t('edit_fixed_asset') : t('add_fixed_asset')}
      </DialogTitle>
      <DialogContent>
        <TextField
          label={t('asset_name')}
          value={form.assetName}
          onChange={e => handleChange('assetName', e.target.value)}
          fullWidth
          margin="normal"
          size="small"
          required
        />
        <FormControl fullWidth margin="normal" size="small">
          <InputLabel>{t('asset_category')}</InputLabel>
          <Select
            value={form.assetCategory}
            label={t('asset_category')}
            onChange={e => handleChange('assetCategory', e.target.value)}
          >
            {ASSET_CATEGORIES.map(cat => (
              <MenuItem key={cat} value={cat}>
                {t(`asset_category_${cat}`)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          label={t('purchase_date')}
          type="date"
          value={form.purchaseDate}
          onChange={e => handleChange('purchaseDate', e.target.value)}
          fullWidth
          margin="normal"
          size="small"
          InputLabelProps={{ shrink: true }}
          required
        />
        <TextField
          label={t('purchase_amount')}
          type="number"
          value={form.purchaseAmount}
          onChange={e => handleChange('purchaseAmount', e.target.value)}
          fullWidth
          margin="normal"
          size="small"
          required
        />
        <TextField
          label={t('useful_life')}
          type="number"
          value={form.usefulLife}
          onChange={e => handleChange('usefulLife', e.target.value)}
          fullWidth
          margin="normal"
          size="small"
          inputProps={{ min: 1, max: 100 }}
          required
        />
        <TextField
          label={t('salvage_value')}
          type="number"
          value={form.salvageValue}
          onChange={e => handleChange('salvageValue', e.target.value)}
          fullWidth
          margin="normal"
          size="small"
          inputProps={{ min: 0 }}
        />
        <FormControl fullWidth margin="normal" size="small">
          <InputLabel>{t('depreciation_method')}</InputLabel>
          <Select
            value={form.depreciationMethod}
            label={t('depreciation_method')}
            onChange={e => handleChange('depreciationMethod', e.target.value)}
          >
            {DEPRECIATION_METHODS.map(method => (
              <MenuItem key={method} value={method}>
                {t(`depreciation_method_${method}`)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          label={t('start_depreciation_date')}
          type="date"
          value={form.startDepreciationDate}
          onChange={e => handleChange('startDepreciationDate', e.target.value)}
          fullWidth
          margin="normal"
          size="small"
          InputLabelProps={{ shrink: true }}
          required
        />
        <TextField
          label={t('asset_notes')}
          value={form.notes ?? ''}
          onChange={e => handleChange('notes', e.target.value)}
          fullWidth
          margin="normal"
          size="small"
          multiline
          rows={2}
        />
        {form.purchaseAmount > 0 && form.usefulLife > 0 && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            {t('monthly_depreciation_amount')}:{' '}
            {Math.floor((form.purchaseAmount - (form.salvageValue ?? 0)) / (form.usefulLife * 12)).toLocaleString()}
            {' '}（{t('depreciation_method_straight_line')} 概算）
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('cancel')}</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={isSaving || !form.assetName || !form.purchaseDate || !form.startDepreciationDate}
        >
          {isSaving ? t('saving') : t('save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
