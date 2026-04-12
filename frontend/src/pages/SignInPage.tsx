import React from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { Container, Box, TextField, Button, Typography, Paper, Alert } from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../app/AuthContext';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Password is required'),
});
type FormData = z.infer<typeof schema>;

export default function SignInPage() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = React.useState('');

  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      await login(data.email, data.password);
      navigate('/dashboard');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message || 'Sign in failed';
      setError(msg);
    }
  };

  return (
    <Container maxWidth="xs">
      <Box sx={{ mt: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Typography variant="h4" gutterBottom>{t('sign_in')}</Typography>
        <Paper elevation={3} sx={{ p: 4, width: '100%' }}>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
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
            <Controller name="password" control={control} render={({ field }) => (
              <TextField
                {...field}
                label={t('password')}
                type="password"
                fullWidth
                margin="normal"
                error={!!errors.password}
                helperText={errors.password?.message}
              />
            )} />
            <Button
              type="submit"
              variant="contained"
              fullWidth
              sx={{ mt: 2 }}
              disabled={isSubmitting}
            >
              {isSubmitting ? t('loading') : t('sign_in')}
            </Button>
          </Box>
        </Paper>
        <Typography mt={2}>
          Don&apos;t have an account? <RouterLink to="/signup">{t('sign_up')}</RouterLink>
        </Typography>
        <Typography variant="body2" align="center" sx={{ mt: 1 }}>
          <RouterLink to="/reset-password/request">{t('forgot_password')}</RouterLink>
        </Typography>
      </Box>
    </Container>
  );
}
