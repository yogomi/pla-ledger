import React, { useEffect, useState } from 'react';
import { useParams, Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  Box, Typography, CircularProgress, Alert, Chip, Button, Divider,
  Paper, Grid, TextField, List, ListItem, ListItemText, Tab, Tabs,
  IconButton,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SecurityIcon from '@mui/icons-material/Security';
import BarChartIcon from '@mui/icons-material/BarChart';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../app/AuthContext';
import api from '../utils/api';
import StartupCostTable, { StartupCostItem } from '../components/StartupCostTable';

interface Comment { id: string; author_id: string; body: string; created_at: string; }
interface Version {
  id: string;
  created_by: string;
  summary: string | null;
  created_at: string;
}
interface Attachment { id: string; filename: string; url: string; mime_type: string; size: number; }
interface Section { id: string; type: string; content: Record<string, unknown>; version: number; }
interface Project {
  id: string; title: string; summary: string | null;
  visibility: string; currency: string; stage: string | null; tags: string[];
  owner_id: string; sections: Section[]; attachments: Attachment[];
}

export default function ProjectViewPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [owner, setOwner] = useState<{ id: string; name: string; email: string } | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [commentBody, setCommentBody] = useState('');
  const [tabValue, setTabValue] = useState(0);

  useEffect(() => {
    Promise.all([
      api.get(`/projects/${id}`),
      api.get(`/projects/${id}/comments`),
      api.get(`/projects/${id}/versions`),
    ]).then(([pRes, cRes, vRes]) => {
      setProject(pRes.data.data.project);
      setOwner(pRes.data.data.owner);
      setRole(pRes.data.data.role);
      setComments(cRes.data.data.comments);
      setVersions(vRes.data.data.versions);
    }).catch(() => setError('Failed to load project')).finally(() => setLoading(false));
  }, [id]);

  const handleAddComment = async () => {
    if (!commentBody.trim()) return;
    try {
      const r = await api.post(`/projects/${id}/comments`, { body: commentBody });
      setComments(prev => [...prev, r.data.data.comment]);
      setCommentBody('');
    } catch {
      alert('Failed to add comment');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this project?')) return;
    await api.delete(`/projects/${id}`);
    navigate('/dashboard');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append('file', file);
    try {
      const r = await api.post(
        `/projects/${id}/attachments`,
        form,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      setProject(prev =>
        prev ? { ...prev, attachments: [...prev.attachments, r.data.data.attachment] } : prev,
      );
    } catch {
      alert('Failed to upload file');
    }
  };

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!project) return null;

  const isOwner = user?.id === project.owner_id;
  const canEdit = role === 'owner' || role === 'editor';

  const financeSection = project.sections?.find(s => s.type === 'finances');

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
        <Box>
          <Typography variant="h4">{project.title}</Typography>
          <Box mt={1} display="flex" gap={1} flexWrap="wrap">
            <Chip
              label={t(project.visibility)}
              color={project.visibility === 'public' ? 'success' : 'default'}
              size="small"
            />
            <Chip label={project.currency} variant="outlined" size="small" />
            {project.stage && <Chip label={project.stage} variant="outlined" size="small" />}
            {owner && <Chip label={`Owner: ${owner.name}`} variant="outlined" size="small" />}
          </Box>
        </Box>
        <Box display="flex" gap={1}>
          {/* viewer・editor・owner いずれかのロールを持つユーザーがシミュレーションにアクセスできる */}
          {role && (
            <Button
              variant="outlined"
              startIcon={<BarChartIcon />}
              component={RouterLink}
              to={`/projects/${id}/simulation`}
            >
              {t('simulation')}
            </Button>
          )}
          {canEdit && (
            <Button
              variant="outlined"
              startIcon={<EditIcon />}
              component={RouterLink}
              to={`/projects/${id}/simulation/edit`}
            >
              {t('simulation_edit')}
            </Button>
          )}
          {canEdit && (
            <Button
              variant="outlined"
              startIcon={<EditIcon />}
              component={RouterLink}
              to={`/projects/${id}/edit`}
            >
              {t('edit_project')}
            </Button>
          )}
          {isOwner && (
            <>
              <Button
                variant="outlined"
                startIcon={<SecurityIcon />}
                component={RouterLink}
                to={`/projects/${id}/access`}
              >
                {t('access_management')}
              </Button>
              <IconButton color="error" onClick={handleDelete}><DeleteIcon /></IconButton>
            </>
          )}
        </Box>
      </Box>

      {project.summary && (
        <Typography variant="body1" color="text.secondary" mb={2}>
          {project.summary}
        </Typography>
      )}

      {project.tags && project.tags.length > 0 && (
        <Box mb={2} display="flex" gap={0.5}>
          {project.tags.map(tag => <Chip key={tag} label={tag} size="small" />)}
        </Box>
      )}

      <Divider sx={{ mb: 2 }} />

      <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ mb: 2 }}>
        <Tab label={t('sections')} />
        <Tab label={t('attachments')} />
        <Tab label={t('comments')} />
        <Tab label={t('versions')} />
      </Tabs>

      {tabValue === 0 && (
        <Grid container spacing={2}>
          {financeSection && (
            <Grid item xs={12}>
              <Paper elevation={1} sx={{ p: 2 }}>
                <Typography variant="h6" mb={2}>{t('startup_costs_section')}</Typography>
                {(() => {
                  const sc = financeSection.content?.startup_costs as
                    | { items?: StartupCostItem[] }
                    | undefined;
                  const items: StartupCostItem[] = sc?.items ?? [];
                  return (
                    <StartupCostTable
                      items={items}
                      currency={project.currency}
                      readOnly
                    />
                  );
                })()}
              </Paper>
            </Grid>
          )}
          {project.sections?.filter(s => s.type !== 'finances').map(s => (
            <Grid item xs={12} key={s.id}>
              <Paper elevation={1} sx={{ p: 2 }}>
                <Typography variant="h6" mb={1}>{t(s.type) || s.type}</Typography>
                <Typography
                  variant="body2"
                  sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap', fontSize: '0.8rem' }}
                >
                  {JSON.stringify(s.content, null, 2)}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}

      {tabValue === 1 && (
        <Box>
          {canEdit && (
            <Box mb={2}>
              <Button variant="outlined" component="label">
                {t('upload_file')}
                <input type="file" hidden onChange={handleFileUpload} />
              </Button>
            </Box>
          )}
          {project.attachments?.length === 0 && (
            <Typography color="text.secondary">No attachments</Typography>
          )}
          <List>
            {project.attachments?.map(att => (
              <ListItem key={att.id} divider>
                <ListItemText
                  primary={
                    <a href={att.url} target="_blank" rel="noopener noreferrer">
                      {att.filename}
                    </a>
                  }
                  secondary={`${att.mime_type} — ${(att.size / 1024).toFixed(1)} KB`}
                />
              </ListItem>
            ))}
          </List>
        </Box>
      )}

      {tabValue === 2 && (
        <Box>
          <List>
            {comments.map(c => (
              <ListItem key={c.id} alignItems="flex-start" divider>
                <ListItemText
                  primary={c.body}
                  secondary={new Date(c.created_at).toLocaleString()}
                />
              </ListItem>
            ))}
          </List>
          {user && (
            <Box mt={2} display="flex" gap={2}>
              <TextField
                value={commentBody}
                onChange={e => setCommentBody(e.target.value)}
                label={t('add_comment')}
                fullWidth
                multiline
                rows={2}
              />
              <Button variant="contained" onClick={handleAddComment} sx={{ alignSelf: 'flex-end' }}>
                {t('submit')}
              </Button>
            </Box>
          )}
          {!user && (
            <Typography color="text.secondary" mt={2}>
              <RouterLink to="/signin">Sign in</RouterLink> to comment.
            </Typography>
          )}
        </Box>
      )}

      {tabValue === 3 && (
        <List>
          {versions.map(v => (
            <ListItem key={v.id} divider>
              <ListItemText
                primary={v.summary ?? 'Version'}
                secondary={new Date(v.created_at).toLocaleString()}
              />
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );
}
