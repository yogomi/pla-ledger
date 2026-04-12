import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Container, Box, TextField, Button, Typography, Paper, Alert, Snackbar,
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import api from '../utils/api';

const schema = z.object({
  newPassword: z.string().min(8),
  confirmPassword: z.string().min(8),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords must match',
  path: ['confirmPassword'],
});
type FormData = z.infer<typeof schema>;

export default function ResetPasswordConfirmPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [tokenValid, setTokenValid] = React.useState<boolean | null>(null);
  const [snackbarOpen, setSnackbarOpen] = React.useState(false);
  const [error, setError] = React.useState('');

  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  React.useEffect(() => {
    if (!token) {
      setTokenValid(false);
      return;
    }
    api.get(`/auth/password-reset/verify?token=${encodeURIComponent(token)}`)
      .then(() => setTokenValid(true))
      .catch(() => setTokenValid(false));
  }, [token]);

  const onSubmit = async (data: FormData) => {
    try {
      setError('');
      await api.post('/auth/password-reset/confirm', {
        token,
        newPassword: data.newPassword,
      });
      setSnackbarOpen(true);
      setTimeout(() => navigate('/signin'), 3000);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message || 'Failed to reset password';
      setError(msg);
    }
  };

  if (tokenValid === null) {
    return (
      <Container maxWidth="xs">
        <Box sx={{ mt: 8, display: 'flex', justifyContent: 'center' }}>
          <Typography>{t('loading')}</Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xs">
      <Box sx={{ mt: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Typography variant="h4" gutterBottom>{t('reset_password_confirm_title')}</Typography>
        <Paper elevation={3} sx={{ p: 4, width: '100%' }}>
          {!tokenValid ? (
            <Alert severity="error">{t('invalid_reset_link')}</Alert>
          ) : (
            <>
              {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
              <Box component="form" onSubmit={handleSubmit(onSubmit)}>
                <Controller name="newPassword" control={control} render={({ field }) => (
                  <TextField
                    {...field}
                    label={t('new_password')}
                    type="password"
                    fullWidth
                    margin="normal"
                    error={!!errors.newPassword}
                    helperText={errors.newPassword?.message}
                  />
                )} />
                <Controller name="confirmPassword" control={control} render={({ field }) => (
                  <TextField
                    {...field}
                    label={t('confirm_password')}
                    type="password"
                    fullWidth
                    margin="normal"
                    error={!!errors.confirmPassword}
                    helperText={
                      errors.confirmPassword?.message
                        ? t('passwords_must_match')
                        : undefined
                    }
                  />
                )} />
                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  sx={{ mt: 2 }}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? t('loading') : t('reset_password')}
                </Button>
              </Box>
            </>
          )}
        </Paper>
      </Box>
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        message={t('reset_password_success')}
      />
    </Container>
  );
}
