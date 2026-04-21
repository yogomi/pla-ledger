import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, TextField, Select, MenuItem, FormControl,
  InputLabel, Paper, Grid, Alert, Divider,
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import api from '../utils/api';

const schema = z.object({
  title: z.string().min(1, 'Title is required'),
  summary: z.string().optional(),
  visibility: z.enum(['public', 'private', 'unlisted']),
  currency: z.string().min(3).max(10),
  tags: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

const CURRENCIES = ['JPY', 'USD', 'EUR', 'GBP', 'CNY', 'KRW'];

export default function ProjectCreatePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [error, setError] = useState('');

  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { visibility: 'private', currency: 'JPY' },
  });

  const onSubmit = async (data: FormData) => {
    try {
      const tags = data.tags ? data.tags.split(',').map(t => t.trim()).filter(Boolean) : [];

      const sections = [
        {
          type: 'finances',
          content: {
            sales_simulation: {},
            expense_breakdown: {},
            profit_loss: {},
            startup_costs: {},
            annual_forecast: {},
          },
        },
        { type: 'narrative', content: { description: '' } },
      ];

      const r = await api.post('/projects', {
        title: data.title,
        summary: data.summary || undefined,
        visibility: data.visibility,
        currency: data.currency,
        tags,
        sections,
      });
      navigate(`/projects/${r.data.data.projectId}`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message || 'Failed to create project';
      setError(msg);
    }
  };

  return (
    <Box>
      <Typography variant="h4" mb={3}>{t('create_project')}</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Paper elevation={2} sx={{ p: 3 }}>
        <Box component="form" onSubmit={handleSubmit(onSubmit)}>
          <Controller name="title" control={control} render={({ field }) => (
            <TextField
              {...field}
              label={t('project_title')}
              fullWidth
              margin="normal"
              required
              error={!!errors.title}
              helperText={errors.title?.message}
            />
          )} />
          <Controller name="summary" control={control} render={({ field }) => (
            <TextField
              {...field}
              label={t('project_summary')}
              fullWidth
              margin="normal"
              multiline
              rows={3}
            />
          )} />

          <Divider sx={{ my: 2 }} />

          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <Controller name="visibility" control={control} render={({ field }) => (
                <FormControl fullWidth margin="normal">
                  <InputLabel>{t('visibility')}</InputLabel>
                  <Select {...field} label={t('visibility')}>
                    <MenuItem value="public">{t('public')}</MenuItem>
                    <MenuItem value="private">{t('private')}</MenuItem>
                    <MenuItem value="unlisted">{t('unlisted')}</MenuItem>
                  </Select>
                </FormControl>
              )} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <Controller name="currency" control={control} render={({ field }) => (
                <FormControl fullWidth margin="normal">
                  <InputLabel>{t('currency')}</InputLabel>
                  <Select {...field} label={t('currency')}>
                    {CURRENCIES.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                  </Select>
                </FormControl>
              )} />
            </Grid>
          </Grid>

          <Controller name="tags" control={control} render={({ field }) => (
            <TextField {...field} label={`${t('tags')} (comma-separated)`} fullWidth margin="normal"
              helperText="e.g. restaurant, food, tokyo" />
          )} />

          <Box mt={3} display="flex" gap={2}>
            <Button type="submit" variant="contained" disabled={isSubmitting}>
              {isSubmitting ? t('loading') : t('create_project')}
            </Button>
            <Button variant="outlined" onClick={() => navigate('/dashboard')}>{t('cancel')}</Button>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}
