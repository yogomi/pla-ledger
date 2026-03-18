import React, { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box, Typography, Grid, Card, CardContent, CardActions, Button,
  Chip, CircularProgress, Alert, TextField, FormControl, InputLabel, Select, MenuItem,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import api from '../utils/api';

interface Project {
  id: string;
  title: string;
  summary: string | null;
  visibility: string;
  currency: string;
  stage: string | null;
  tags: string[];
}

export default function PublicProjectsPage() {
  const { t } = useTranslation();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [keyword, setKeyword] = useState('');
  const [currency, setCurrency] = useState('');

  const load = (kw = keyword, cur = currency) => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (kw) params['keyword'] = kw;
    if (cur) params['currency'] = cur;
    api.get('/projects/public', { params }).then(r => {
      setProjects(r.data.data.projects);
    }).catch(() => setError('Failed to load projects')).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  return (
    <Box>
      <Box mb={4} textAlign="center">
        <Typography variant="h4" gutterBottom>{t('welcome')}</Typography>
        <Typography variant="body1" color="text.secondary">{t('subtitle')}</Typography>
      </Box>

      <Box mb={3} display="flex" gap={2} flexWrap="wrap">
        <TextField
          size="small"
          label={t('search_projects')}
          value={keyword}
          onChange={e => setKeyword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && load()}
          sx={{ minWidth: 220 }}
        />
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>{t('currency')}</InputLabel>
          <Select
            value={currency}
            label={t('currency')}
            onChange={e => {
              setCurrency(e.target.value);
              load(keyword, e.target.value);
            }}
          >
            <MenuItem value="">All</MenuItem>
            {['JPY', 'USD', 'EUR', 'GBP', 'CNY', 'KRW'].map(c => (
              <MenuItem key={c} value={c}>{c}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button variant="contained" onClick={() => load()}>{t('search')}</Button>
      </Box>

      {loading && <CircularProgress />}
      {error && <Alert severity="error">{error}</Alert>}
      {!loading && !error && (
        projects.length === 0 ? (
          <Typography color="text.secondary">{t('no_projects')}</Typography>
        ) : (
          <Grid container spacing={2}>
            {projects.map(p => (
              <Grid item xs={12} sm={6} md={4} key={p.id}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" noWrap>{p.title}</Typography>
                    {p.summary && (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mt: 0.5, mb: 1 }}
                        noWrap
                      >
                        {p.summary}
                      </Typography>
                    )}
                    <Box display="flex" gap={0.5} flexWrap="wrap">
                      <Chip label={p.currency} size="small" variant="outlined" />
                      {p.stage && <Chip label={p.stage} size="small" variant="outlined" />}
                    </Box>
                    {p.tags && p.tags.length > 0 && (
                      <Box mt={1} display="flex" gap={0.5} flexWrap="wrap">
                        {p.tags.slice(0, 3).map(tag => <Chip key={tag} label={tag} size="small" />)}
                      </Box>
                    )}
                  </CardContent>
                  <CardActions>
                    <Button
                      size="small"
                      component={RouterLink}
                      to={`/projects/${p.id}`}
                    >
                      View
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        )
      )}
    </Box>
  );
}
