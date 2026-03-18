import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box, Typography, Button, TextField, Select, MenuItem, FormControl,
  InputLabel, Paper, Grid, Alert, Divider, CircularProgress,
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
  stage: z.string().optional(),
  tags: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

const CURRENCIES = ['JPY', 'USD', 'EUR', 'GBP', 'CNY', 'KRW'];
const STAGES = ['idea', 'planning', 'launch', 'growth', 'mature'];

export default function ProjectEditPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const { control, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { visibility: 'private', currency: 'JPY' },
  });

  useEffect(() => {
    api.get(`/projects/${id}`).then(r => {
      const p = r.data.data.project;
      reset({
        title: p.title || '',
        summary: p.summary || '',
        visibility: p.visibility,
        currency: p.currency,
        stage: p.stage || '',
        tags: Array.isArray(p.tags) ? p.tags.join(', ') : '',
      });
    }).catch(() => setError('Failed to load project')).finally(() => setLoading(false));
  }, [id, reset]);

  const onSubmit = async (data: FormData) => {
    try {
      const tags = data.tags ? data.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
      await api.put(`/projects/${id}`, {
        title: data.title,
        summary: data.summary || undefined,
        visibility: data.visibility,
        currency: data.currency,
        stage: data.stage || null,
        tags,
      });
      navigate(`/projects/${id}`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message || 'Failed to update project';
      setError(msg);
    }
  };

  if (loading) return <CircularProgress />;

  return (
    <Box>
      <Typography variant="h4" mb={3}>{t('edit_project')}</Typography>
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
            <Grid item xs={12} sm={4}>
              <Controller name="stage" control={control} render={({ field }) => (
                <FormControl fullWidth margin="normal">
                  <InputLabel>{t('stage')}</InputLabel>
                  <Select {...field} label={t('stage')}>
                    <MenuItem value="">(none)</MenuItem>
                    {STAGES.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                  </Select>
                </FormControl>
              )} />
            </Grid>
          </Grid>

          <Controller name="tags" control={control} render={({ field }) => (
            <TextField
              {...field}
              label={`${t('tags')} (comma-separated)`}
              fullWidth
              margin="normal"
            />
          )} />

          <Box mt={3} display="flex" gap={2}>
            <Button type="submit" variant="contained" disabled={isSubmitting}>
              {isSubmitting ? t('loading') : t('save')}
            </Button>
            <Button variant="outlined" onClick={() => navigate(`/projects/${id}`)}>
              {t('cancel')}
            </Button>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}
