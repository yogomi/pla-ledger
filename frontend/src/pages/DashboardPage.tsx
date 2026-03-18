import React, { useEffect, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Grid, Card, CardContent, CardActionArea,
  Chip, CircularProgress, Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../app/AuthContext';
import api from '../utils/api';

interface Project {
  id: string;
  title: string;
  visibility: string;
  currency: string;
  stage: string | null;
  tags: string[];
  created_at: string;
}

export default function DashboardPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/projects').then(r => {
      setProjects(r.data.data.projects);
    }).catch(() => {
      setError('Failed to load projects');
    }).finally(() => setLoading(false));
  }, []);

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">{t('dashboard')}</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          component={RouterLink}
          to="/projects/new"
        >
          {t('create_project')}
        </Button>
      </Box>
      {user && (
        <Typography variant="body1" color="text.secondary" mb={3}>
          Welcome, {user.name}
        </Typography>
      )}
      {loading && <CircularProgress />}
      {error && <Alert severity="error">{error}</Alert>}
      {!loading && !error && (
        <>
          <Typography variant="h6" mb={2}>{t('my_projects')}</Typography>
          {projects.length === 0 ? (
            <Typography color="text.secondary">{t('no_projects')}</Typography>
          ) : (
            <Grid container spacing={2}>
              {projects.map(p => (
                <Grid item xs={12} sm={6} md={4} key={p.id}>
                  {/* カード全体をクリック可能にして /projects/:id?tab=project へ遷移 */}
                  <Card>
                    <CardActionArea onClick={() => navigate(`/projects/${p.id}?tab=project`)}>
                      <CardContent>
                        <Typography variant="h6" noWrap>{p.title}</Typography>
                        <Box mt={1} display="flex" gap={0.5} flexWrap="wrap">
                          <Chip
                            label={t(p.visibility)}
                            size="small"
                            color={p.visibility === 'public' ? 'success' : 'default'}
                          />
                          <Chip label={p.currency} size="small" variant="outlined" />
                          {p.stage && <Chip label={p.stage} size="small" variant="outlined" />}
                        </Box>
                        {p.tags && p.tags.length > 0 && (
                          <Box mt={1} display="flex" gap={0.5} flexWrap="wrap">
                            {p.tags.slice(0, 3).map(tag => (
                              <Chip key={tag} label={tag} size="small" variant="outlined" />
                            ))}
                          </Box>
                        )}
                      </CardContent>
                    </CardActionArea>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </>
      )}
    </Box>
  );
}
