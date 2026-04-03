import React from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Container, Box, TextField, Button, Typography, Paper, Alert,
  FormControl, InputLabel, Select, MenuItem,
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../app/AuthContext';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required'),
  locale: z.enum(['en', 'ja', 'uk']),
});
type FormData = z.infer<typeof schema>;

const getDefaultLocale = (): 'en' | 'ja' | 'uk' => {
  const browserLang = navigator.language.toLowerCase();
  if (browserLang.startsWith('ja')) {
    return 'ja';
  }
  if (browserLang.startsWith('uk')) {
    return 'uk';
  }
  return 'en';
};

export default function SignUpPage() {
  const { t } = useTranslation();
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = React.useState('');

  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { locale: getDefaultLocale() },
  });

  const onSubmit = async (data: FormData) => {
    try {
      await signup(data.email, data.password, data.name, data.locale);
      navigate('/dashboard');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message || 'Sign up failed';
      setError(msg);
    }
  };

  return (
    <Container maxWidth="xs">
      <Box sx={{ mt: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Typography variant="h4" gutterBottom>{t('sign_up')}</Typography>
        <Paper elevation={3} sx={{ p: 4, width: '100%' }}>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Box component="form" onSubmit={handleSubmit(onSubmit)}>
            <Controller name="name" control={control} render={({ field }) => (
              <TextField
                {...field}
                label={t('name')}
                fullWidth
                margin="normal"
                error={!!errors.name}
                helperText={errors.name?.message}
              />
            )} />
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
            <Controller name="locale" control={control} render={({ field }) => (
              <FormControl fullWidth margin="normal">
                <InputLabel>{t('language')}</InputLabel>
                <Select {...field} label={t('language')}>
                  <MenuItem value="en">{t('locale_en')}</MenuItem>
                  <MenuItem value="ja">{t('locale_ja')}</MenuItem>
                  <MenuItem value="uk">{t('locale_uk')}</MenuItem>
                </Select>
              </FormControl>
            )} />
            <Button
              type="submit"
              variant="contained"
              fullWidth
              sx={{ mt: 2 }}
              disabled={isSubmitting}
            >
              {isSubmitting ? t('loading') : t('sign_up')}
            </Button>
          </Box>
        </Paper>
        <Typography mt={2}>
          Already have an account? <RouterLink to="/signin">{t('sign_in')}</RouterLink>
        </Typography>
      </Box>
    </Container>
  );
}
