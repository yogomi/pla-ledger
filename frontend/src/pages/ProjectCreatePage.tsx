import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, TextField, Select, MenuItem, FormControl,
  InputLabel, Paper, Grid, Chip, Alert, Tabs, Tab, Divider,
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import api from '../utils/api';

const schema = z.object({
  title_en: z.string().min(1, 'English title is required'),
  title_ja: z.string().optional(),
  summary_en: z.string().optional(),
  summary_ja: z.string().optional(),
  visibility: z.enum(['public', 'private', 'unlisted']),
  currency: z.string().min(3).max(10),
  stage: z.string().optional(),
  tags: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

const CURRENCIES = ['JPY', 'USD', 'EUR', 'GBP', 'CNY', 'KRW'];
const STAGES = ['idea', 'planning', 'launch', 'growth', 'mature'];

export default function ProjectCreatePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [langTab, setLangTab] = useState(0);

  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { visibility: 'private', currency: 'JPY', stage: '' },
  });

  const onSubmit = async (data: FormData) => {
    try {
      const title: Record<string, string> = { en: data.title_en };
      if (data.title_ja) title['ja'] = data.title_ja;
      const summary: Record<string, string> = {};
      if (data.summary_en) summary['en'] = data.summary_en;
      if (data.summary_ja) summary['ja'] = data.summary_ja;
      const tags = data.tags ? data.tags.split(',').map(t => t.trim()).filter(Boolean) : [];

      // Default financial sections
      const sections = [
        { type: 'finances', content: { sales_simulation: {}, expense_breakdown: {}, profit_loss: {}, startup_costs: {}, annual_forecast: {} } },
        { type: 'narrative', content: { description: { en: '', ja: '' } } },
      ];

      const r = await api.post('/projects', {
        title,
        summary: Object.keys(summary).length > 0 ? summary : undefined,
        visibility: data.visibility,
        currency: data.currency,
        stage: data.stage || undefined,
        tags,
        sections,
      });
      navigate(`/projects/${r.data.data.projectId}`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to create project';
      setError(msg);
    }
  };

  return (
    <Box>
      <Typography variant="h4" mb={3}>{t('create_project')}</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Paper elevation={2} sx={{ p: 3 }}>
        <Box component="form" onSubmit={handleSubmit(onSubmit)}>
          <Tabs value={langTab} onChange={(_, v) => setLangTab(v)} sx={{ mb: 2 }}>
            <Tab label="English" />
            <Tab label="日本語" />
          </Tabs>

          {langTab === 0 && (
            <Box>
              <Controller name="title_en" control={control} render={({ field }) => (
                <TextField {...field} label={`${t('project_title')} (EN)`} fullWidth margin="normal" required
                  error={!!errors.title_en} helperText={errors.title_en?.message} />
              )} />
              <Controller name="summary_en" control={control} render={({ field }) => (
                <TextField {...field} label={`${t('project_summary')} (EN)`} fullWidth margin="normal" multiline rows={3} />
              )} />
            </Box>
          )}

          {langTab === 1 && (
            <Box>
              <Controller name="title_ja" control={control} render={({ field }) => (
                <TextField {...field} label={`${t('project_title')} (JA)`} fullWidth margin="normal" />
              )} />
              <Controller name="summary_ja" control={control} render={({ field }) => (
                <TextField {...field} label={`${t('project_summary')} (JA)`} fullWidth margin="normal" multiline rows={3} />
              )} />
            </Box>
          )}

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
