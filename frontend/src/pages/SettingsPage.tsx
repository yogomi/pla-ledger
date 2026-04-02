import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, TextField, Button, Alert, Select, MenuItem,
  FormControl, InputLabel, Divider,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../app/AuthContext';
import i18n from '../i18n';
import api from '../utils/api';

export default function SettingsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [locale, setLocale] = useState(i18n.language || 'en');
  const [name, setName] = useState(user?.name || '');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) setName(user.name);
  }, [user]);

  const handleSaveLocale = async () => {
    try {
      i18n.changeLanguage(locale);
      localStorage.setItem('locale', locale);
      setSuccess('Language updated');
    } catch {
      setError('Failed to update language');
    }
  };

  return (
    <Box>
      <Typography variant="h4" mb={3}>{t('settings')}</Typography>

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" mb={2}>{t('account')}</Typography>
        <TextField
          label={t('name')}
          value={name}
          onChange={e => setName(e.target.value)}
          fullWidth
          margin="normal"
        />
        <TextField
          label={t('email')}
          value={user?.email || ''}
          fullWidth
          margin="normal"
          disabled
        />
        <Button variant="contained" sx={{ mt: 1 }} disabled>
          {t('save')}
        </Button>
      </Paper>

      <Divider sx={{ my: 3 }} />

      <Paper elevation={2} sx={{ p: 3 }}>
        <Typography variant="h6" mb={2}>{t('language')}</Typography>
        <FormControl sx={{ minWidth: 180 }}>
          <InputLabel>{t('language')}</InputLabel>
          <Select value={locale} label={t('language')} onChange={e => setLocale(e.target.value)}>
            <MenuItem value="en">{t('locale_en')}</MenuItem>
            <MenuItem value="ja">{t('locale_ja')}</MenuItem>
            <MenuItem value="uk">{t('locale_uk')}</MenuItem>
          </Select>
        </FormControl>
        <Box mt={2}>
          <Button variant="contained" onClick={handleSaveLocale}>{t('save')}</Button>
        </Box>
      </Paper>
    </Box>
  );
}
