import React, { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box, Typography, TextField, Button, Grid, Card, CardContent, CardActions,
  Chip, CircularProgress, Alert,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import api from '../utils/api';

interface Project {
  id: string;
  title: string;
  visibility: string;
  currency: string;
  tags: string[];
}

export default function SearchPage() {
  const { t } = useTranslation();
  const [q, setQ] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!q.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const r = await api.get('/search', { params: { q } });
      setProjects(r.data.data.projects);
    } catch {
      setError('Search failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" mb={3}>{t('search_projects')}</Typography>
      <Box display="flex" gap={2} mb={3}>
        <TextField
          value={q}
          onChange={e => setQ(e.target.value)}
          label={t('search')}
          fullWidth
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
        />
        <Button variant="contained" onClick={handleSearch}>{t('search')}</Button>
      </Box>
      {loading && <CircularProgress />}
      {error && <Alert severity="error">{error}</Alert>}
      {!loading && searched && (
        projects.length === 0 ? (
          <Typography color="text.secondary">{t('no_projects')}</Typography>
        ) : (
          <Grid container spacing={2}>
            {projects.map(p => (
              <Grid item xs={12} sm={6} md={4} key={p.id}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" noWrap>{p.title}</Typography>
                    <Box mt={1} display="flex" gap={0.5} flexWrap="wrap">
                      <Chip label={p.currency} size="small" variant="outlined" />
                    </Box>
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
