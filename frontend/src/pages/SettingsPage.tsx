import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, TextField, Button, Alert, Select, MenuItem,
  FormControl, InputLabel, Divider, Snackbar,
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../app/AuthContext';
import i18n from '../i18n';
import api from '../utils/api';

/** パスワード変更フォームのバリデーションスキーマ */
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
  confirmNewPassword: z.string().min(1),
}).refine((data) => data.newPassword === data.confirmNewPassword, {
  path: ['confirmNewPassword'],
  message: 'passwords_must_match',
});

type ChangePasswordForm = z.infer<typeof changePasswordSchema>;

export default function SettingsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [locale, setLocale] = useState(i18n.language || 'en');
  const [name, setName] = useState(user?.name || '');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [snackOpen, setSnackOpen] = useState(false);
  const [snackMessage, setSnackMessage] = useState('');
  const [snackSeverity, setSnackSeverity] = useState<'error'>('error');

  const {
    control,
    handleSubmit,
    reset: resetPasswordForm,
    formState: { errors: passwordErrors, isSubmitting: isPasswordSubmitting },
  } = useForm<ChangePasswordForm>({
    resolver: zodResolver(changePasswordSchema),
  });

  useEffect(() => {
    if (user) setName(user.name);
  }, [user]);

  const handleSaveLocale = async () => {
    try {
      i18n.changeLanguage(locale);
      localStorage.setItem('locale', locale);
      setSuccess('Language updated');
    } catch {
      const message = 'Failed to update language';
      setError(message);
      setSnackMessage(message);
      setSnackSeverity('error');
      setSnackOpen(true);
    }
  };

  const onChangePassword = async (data: ChangePasswordForm) => {
    try {
      setPasswordError('');
      setPasswordSuccess('');
      await api.post('/auth/change-password', {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      setPasswordSuccess(t('password_changed_successfully'));
      resetPasswordForm();
    } catch (err: unknown) {
      const resData = (err as { response?: { data?: { code?: string; message?: string } } })
        ?.response?.data;
      if (resData?.code === 'invalid_password') {
        const message = t('current_password_incorrect');
        setPasswordError(message);
        setSnackMessage(message);
      } else {
        const message = resData?.message || t('error');
        setPasswordError(message);
        setSnackMessage(message);
      }
      setSnackSeverity('error');
      setSnackOpen(true);
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

      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" mb={2}>{t('password')}</Typography>
        {passwordSuccess && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setPasswordSuccess('')}>
            {passwordSuccess}
          </Alert>
        )}
        {passwordError && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setPasswordError('')}>
            {passwordError}
          </Alert>
        )}
        <Box component="form" onSubmit={handleSubmit(onChangePassword)}>
          <Controller
            name="currentPassword"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label={t('current_password')}
                type="password"
                fullWidth
                margin="normal"
                error={!!passwordErrors.currentPassword}
              />
            )}
          />
          <Controller
            name="newPassword"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label={t('new_password')}
                type="password"
                fullWidth
                margin="normal"
                error={!!passwordErrors.newPassword}
                helperText={
                  passwordErrors.newPassword ? t('password_min_length') : undefined
                }
              />
            )}
          />
          <Controller
            name="confirmNewPassword"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label={t('confirm_new_password')}
                type="password"
                fullWidth
                margin="normal"
                error={!!passwordErrors.confirmNewPassword}
                helperText={
                  passwordErrors.confirmNewPassword ? t('passwords_must_match') : undefined
                }
              />
            )}
          />
          <Button
            type="submit"
            variant="contained"
            sx={{ mt: 1 }}
            disabled={isPasswordSubmitting}
          >
            {isPasswordSubmitting ? t('loading') : t('change_password')}
          </Button>
        </Box>
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

      <Snackbar
        open={snackOpen}
        autoHideDuration={6000}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        onClose={() => setSnackOpen(false)}
      >
        <Alert severity={snackSeverity} onClose={() => setSnackOpen(false)}>
          {snackMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
