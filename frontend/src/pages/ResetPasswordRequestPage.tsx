import React from 'react';
import { Container, Box, TextField, Button, Typography, Paper, Alert } from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import api from '../utils/api';

const schema = z.object({
  email: z.string().email(),
});
type FormData = z.infer<typeof schema>;

export default function ResetPasswordRequestPage() {
  const { t } = useTranslation();
  const [successMessage, setSuccessMessage] = React.useState('');
  const [error, setError] = React.useState('');

  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      setError('');
      await api.post('/auth/password-reset/request', { email: data.email });
      setSuccessMessage(t('reset_password_request_success'));
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message || 'Failed to send reset link';
      setError(msg);
    }
  };

  return (
    <Container maxWidth="xs">
      <Box sx={{ mt: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Typography variant="h4" gutterBottom>{t('reset_password_request_title')}</Typography>
        <Paper elevation={3} sx={{ p: 4, width: '100%' }}>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {successMessage ? (
            <Alert severity="success">{successMessage}</Alert>
          ) : (
            <>
              <Typography variant="body2" sx={{ mb: 2 }}>
                {t('reset_password_request_description')}
              </Typography>
              <Box component="form" onSubmit={handleSubmit(onSubmit)}>
                <Controller name="email" control={control} render={({ field }) => (
                  <TextField
                    {...field}
                    label={t('email')}
                    type="email"
                    fullWidth
                    margin="normal"
                    error={!!errors.email}
                    helperText={errors.email?.message}
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
    </Container>
  );
}
