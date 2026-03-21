import React, { useEffect, useState } from 'react';
import { useParams, Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box, Typography, CircularProgress, Alert, Chip, Button, Divider,
  Paper, Grid, TextField, List, ListItem, ListItemText, Tab, Tabs,
  IconButton, Select, MenuItem, FormControl, InputLabel, ListItemSecondaryAction,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../app/AuthContext';
import api from '../utils/api';
import StartupCostTable, { StartupCostItem } from '../components/StartupCostTable';
import SimulationViewContainer from '../components/SimulationViewContainer';
import SimulationSheetContainer from '../components/SimulationSheetContainer';

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
  social_insurance_rate: number | null;
}
interface AccessRequest {
  id: string; requester_id: string; request_type: string; message: string | null;
  status: string; created_at: string;
}
interface Permission {
  id: string; user_id: string; role: string; granted_at: string;
  user?: { id: string; name: string; email: string };
}

/** プロジェクト編集フォームのバリデーションスキーマ */
const editSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  summary: z.string().optional(),
  visibility: z.enum(['public', 'private', 'unlisted']),
  currency: z.string().min(3).max(10),
  stage: z.string().optional(),
  tags: z.string().optional(),
  social_insurance_rate: z.number().min(0).max(100).optional(),
});
type EditFormData = z.infer<typeof editSchema>;

const CURRENCIES = ['JPY', 'USD', 'EUR', 'GBP', 'CNY', 'KRW'];
const STAGES = ['idea', 'planning', 'launch', 'growth', 'mature'];

export default function ProjectViewPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  /** URL クエリパラメータからアクティブタブを取得（デフォルト: project） */
  const activeTab = searchParams.get('tab') || 'project';

  // プロジェクト情報
  const [project, setProject] = useState<Project | null>(null);
  const [owner, setOwner] = useState<{ id: string; name: string; email: string } | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [commentBody, setCommentBody] = useState('');
  const [innerTabValue, setInnerTabValue] = useState(0);

  /** Simulation / Simulation Input タブ間で共有する年月 (YYYY-MM) */
  const [simulationYearMonth, setSimulationYearMonth] = useState(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  });

  // 編集フォーム
  const [editError, setEditError] = useState('');
  const [editCurrency, setEditCurrency] = useState('JPY');
  const [startupCostItems, setStartupCostItems] = useState<StartupCostItem[]>([]);
  const {
    control: editControl,
    handleSubmit: handleEditSubmit,
    reset: resetEditForm,
    watch: watchEdit,
    formState: { errors: editErrors, isSubmitting: editSubmitting },
  } = useForm<EditFormData>({
    resolver: zodResolver(editSchema),
    defaultValues: { visibility: 'private', currency: 'JPY', social_insurance_rate: 15 },
  });
  const watchedCurrency = watchEdit('currency', 'JPY');
  useEffect(() => { setEditCurrency(watchedCurrency); }, [watchedCurrency]);

  // アクセス管理
  const [accessRequests, setAccessRequests] = useState<AccessRequest[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [accessLoading, setAccessLoading] = useState(false);
  const [accessError, setAccessError] = useState('');
  const [grantUserId, setGrantUserId] = useState('');
  const [grantRole, setGrantRole] = useState<'editor' | 'viewer'>('viewer');

  /** プロジェクト情報・コメント・バージョンを並行取得 */
  useEffect(() => {
    Promise.all([
      api.get(`/projects/${id}`),
      api.get(`/projects/${id}/comments`),
      api.get(`/projects/${id}/versions`),
    ]).then(([pRes, cRes, vRes]) => {
      const p = pRes.data.data.project;
      setProject(p);
      setOwner(pRes.data.data.owner);
      setRole(pRes.data.data.role);
      setComments(cRes.data.data.comments);
      setVersions(vRes.data.data.versions);

      // 編集フォームに既存データを反映
      resetEditForm({
        title: p.title || '',
        summary: p.summary || '',
        visibility: p.visibility,
        currency: p.currency,
        stage: p.stage || '',
        tags: Array.isArray(p.tags) ? p.tags.join(', ') : '',
        social_insurance_rate: p.social_insurance_rate != null ? Number(p.social_insurance_rate) : 15,
      });
      setEditCurrency(p.currency || 'JPY');
      const financeSection = (p.sections ?? []).find(
        (s: Section) => s.type === 'finances',
      );
      if (financeSection?.content?.startup_costs) {
        const sc = financeSection.content.startup_costs as { items?: StartupCostItem[] };
        setStartupCostItems(sc.items ?? []);
      }
    }).catch(() => setError('Failed to load project')).finally(() => setLoading(false));
  }, [id]);

  /** アクセス管理タブがアクティブになった際にデータを取得 */
  const loadAccessData = () => {
    setAccessLoading(true);
    setAccessError('');
    Promise.all([
      api.get(`/projects/${id}/access-requests`),
      api.get(`/projects/${id}/permissions`),
    ]).then(([aRes, pRes]) => {
      setAccessRequests(aRes.data.data.requests);
      setPermissions(pRes.data.data.permissions);
    }).catch(() => setAccessError('Failed to load'))
      .finally(() => setAccessLoading(false));
  };

  useEffect(() => {
    if (activeTab === 'access' && id) {
      loadAccessData();
    }
  }, [activeTab, id]);

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

  const handleEditSave = async (data: EditFormData) => {
    setEditError('');
    try {
      const tags = data.tags ? data.tags.split(',').map(tag => tag.trim()).filter(Boolean) : [];
      const sections = [
        {
          type: 'finances',
          content: { startup_costs: { items: startupCostItems } },
        },
      ];
      await api.put(`/projects/${id}`, {
        title: data.title,
        summary: data.summary || undefined,
        visibility: data.visibility,
        currency: data.currency,
        stage: data.stage || null,
        tags,
        sections,
        social_insurance_rate: data.social_insurance_rate,
      });
      // 保存後はプロジェクトタブに戻る
      setSearchParams({ tab: 'project' }, { replace: true });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message || 'Failed to update project';
      setEditError(msg);
    }
  };

  const handleAccessProcess = async (reqId: string, action: 'approve' | 'reject') => {
    try {
      await api.post(`/projects/${id}/access-requests/${reqId}`, { action });
      loadAccessData();
    } catch { alert('Failed'); }
  };

  const handleGrant = async () => {
    if (!grantUserId.trim()) return;
    try {
      await api.post(`/projects/${id}/grant`, { user_id: grantUserId, role: grantRole });
      setGrantUserId('');
      loadAccessData();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message || 'Failed to grant';
      alert(msg);
    }
  };

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!project) return null;

  const isOwner = user?.id === project.owner_id;
  const canEdit = role === 'owner' || role === 'editor';
  const financeSection = project.sections?.find(s => s.type === 'finances');

  /** 権限に応じて表示するタブ一覧を構築 */
  const visibleTabs = [
    { value: 'project', label: t('project_tab') },
    ...(role ? [{ value: 'simulation', label: t('simulation') }] : []),
    ...(canEdit ? [{ value: 'simulation-input', label: t('simulation_edit') }] : []),
    ...(canEdit ? [{ value: 'edit', label: t('edit_project') }] : []),
    ...(isOwner ? [{ value: 'access', label: t('access_management') }] : []),
  ];

  /** タブ切り替え時に URL クエリパラメータを更新 */
  const handleTabChange = (_: React.SyntheticEvent, newTab: string) => {
    setSearchParams({ tab: newTab }, { replace: true });
  };

  const accessStatusColor = (s: string) =>
    s === 'approved' ? 'success' : s === 'rejected' ? 'error' : 'warning';

  return (
    <Box>
      {/* ヘッダー: タイトル・チップ・削除ボタン */}
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
        {/* owner のみ削除ボタンを表示 */}
        {isOwner && (
          <IconButton color="error" onClick={handleDelete} aria-label={t('delete_project')}>
            <DeleteIcon />
          </IconButton>
        )}
      </Box>

      {/* トップレベルタブ（権限に応じて表示制御） */}
      <Paper
        elevation={0}
        sx={{ mb: 3, bgcolor: 'grey.50', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}
      >
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            '& .MuiTabs-indicator': { height: 3, borderRadius: 1 },
            '& .MuiTab-root': { fontWeight: 600, py: 2, minWidth: 120, fontSize: '0.9rem' },
          }}
        >
          {visibleTabs.map(tab => (
            <Tab key={tab.value} value={tab.value} label={tab.label} />
          ))}
        </Tabs>
      </Paper>

      {/* ===== Project タブ ===== */}
      {activeTab === 'project' && (
        <Box>
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
          <Tabs value={innerTabValue} onChange={(_, v) => setInnerTabValue(v)} sx={{ mb: 2 }}>
            <Tab label={t('sections')} />
            <Tab label={t('attachments')} />
            <Tab label={t('comments')} />
            <Tab label={t('versions')} />
          </Tabs>

          {innerTabValue === 0 && (
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
                        <StartupCostTable items={items} currency={project.currency} readOnly />
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

          {innerTabValue === 1 && (
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

          {innerTabValue === 2 && (
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
                  <Button
                    variant="contained"
                    onClick={handleAddComment}
                    sx={{ alignSelf: 'flex-end' }}
                  >
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

          {innerTabValue === 3 && (
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
      )}

      {/* ===== Simulation タブ ===== */}
      {activeTab === 'simulation' && role && (
        <SimulationViewContainer
          projectId={id!}
          yearMonth={simulationYearMonth}
          onYearMonthChange={setSimulationYearMonth}
          currency={project.currency}
        />
      )}

      {/* ===== Simulation Input タブ ===== */}
      {activeTab === 'simulation-input' && canEdit && (
        <SimulationSheetContainer
          projectId={id!}
          yearMonth={simulationYearMonth}
          onYearMonthChange={setSimulationYearMonth}
          currency={project.currency}
        />
      )}

      {/* ===== Edit タブ ===== */}
      {activeTab === 'edit' && canEdit && (
        <Box>
          {editError && <Alert severity="error" sx={{ mb: 2 }}>{editError}</Alert>}
          <Paper elevation={2} sx={{ p: 3 }}>
            <Box component="form" onSubmit={handleEditSubmit(handleEditSave)}>
              <Controller name="title" control={editControl} render={({ field }) => (
                <TextField
                  {...field}
                  label={t('project_title')}
                  fullWidth
                  margin="normal"
                  required
                  error={!!editErrors.title}
                  helperText={editErrors.title?.message}
                />
              )} />
              <Controller name="summary" control={editControl} render={({ field }) => (
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
                  <Controller name="visibility" control={editControl} render={({ field }) => (
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
                  <Controller name="currency" control={editControl} render={({ field }) => (
                    <FormControl fullWidth margin="normal">
                      <InputLabel>{t('currency')}</InputLabel>
                      <Select {...field} label={t('currency')}>
                        {CURRENCIES.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                      </Select>
                    </FormControl>
                  )} />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Controller name="stage" control={editControl} render={({ field }) => (
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

              <Controller name="tags" control={editControl} render={({ field }) => (
                <TextField
                  {...field}
                  label={`${t('tags')} (comma-separated)`}
                  fullWidth
                  margin="normal"
                />
              )} />

              <Divider sx={{ my: 3 }} />

              <Typography variant="h6" mb={2}>{t('social_insurance_rate')}</Typography>
              <Controller
                name="social_insurance_rate"
                control={editControl}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label={t('social_insurance_rate')}
                    type="number"
                    margin="normal"
                    inputProps={{ min: 0, max: 100, step: 0.1 }}
                    sx={{ width: 200 }}
                    helperText={t('social_insurance_rate_hint')}
                    InputProps={{ endAdornment: '%' }}
                    onChange={e => field.onChange(Number(e.target.value))}
                  />
                )}
              />

              <Divider sx={{ my: 3 }} />

              <Typography variant="h6" mb={2}>{t('startup_costs_section')}</Typography>
              <StartupCostTable
                items={startupCostItems}
                currency={editCurrency}
                onItemsChange={setStartupCostItems}
              />

              <Box mt={3} display="flex" gap={2}>
                <Button type="submit" variant="contained" disabled={editSubmitting}>
                  {editSubmitting ? t('loading') : t('save')}
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => setSearchParams({ tab: 'project' }, { replace: true })}
                >
                  {t('cancel')}
                </Button>
              </Box>
            </Box>
          </Paper>
        </Box>
      )}

      {/* ===== Access Management タブ ===== */}
      {activeTab === 'access' && isOwner && (
        <Box>
          {accessLoading && <CircularProgress />}
          {accessError && <Alert severity="error">{accessError}</Alert>}
          {!accessLoading && !accessError && (
            <>
              <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" mb={2}>{t('grant_access')}</Typography>
                <Box display="flex" gap={2} flexWrap="wrap" alignItems="flex-end">
                  <TextField
                    label="User ID"
                    value={grantUserId}
                    onChange={e => setGrantUserId(e.target.value)}
                    size="small"
                    sx={{ minWidth: 300 }}
                  />
                  <FormControl size="small" sx={{ minWidth: 120 }}>
                    <InputLabel>Role</InputLabel>
                    <Select
                      value={grantRole}
                      label="Role"
                      onChange={e => setGrantRole(e.target.value as 'editor' | 'viewer')}
                    >
                      <MenuItem value="editor">{t('editor')}</MenuItem>
                      <MenuItem value="viewer">{t('viewer')}</MenuItem>
                    </Select>
                  </FormControl>
                  <Button variant="contained" onClick={handleGrant}>{t('grant_access')}</Button>
                </Box>
              </Paper>

              <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" mb={2}>Current Permissions</Typography>
                <List>
                  {permissions.map(p => (
                    <ListItem key={p.id} divider>
                      <ListItemText
                        primary={p.user ? `${p.user.name} (${p.user.email})` : p.user_id}
                        secondary={`Role: ${p.role}`}
                      />
                      <Chip
                        label={p.role}
                        size="small"
                        color={
                          p.role === 'owner' ? 'primary'
                          : p.role === 'editor' ? 'secondary'
                          : 'default'
                        }
                      />
                    </ListItem>
                  ))}
                  {permissions.length === 0 && (
                    <Typography color="text.secondary">No permissions</Typography>
                  )}
                </List>
              </Paper>

              <Divider sx={{ my: 3 }} />

              <Typography variant="h6" mb={2}>Access Requests</Typography>
              <List>
                {accessRequests.map(r => (
                  <ListItem key={r.id} divider alignItems="flex-start">
                    <ListItemText
                      primary={
                        `${r.request_type === 'edit' ? 'Edit' : 'View'} request from ${r.requester_id}`
                      }
                      secondary={
                        <>
                          {r.message && <span>{r.message}<br /></span>}
                          <span>{new Date(r.created_at).toLocaleString()}</span>
                        </>
                      }
                    />
                    <ListItemSecondaryAction>
                      <Chip
                        label={t(r.status)}
                        size="small"
                        color={accessStatusColor(r.status) as 'success' | 'error' | 'warning'}
                        sx={{ mr: 1 }}
                      />
                      {r.status === 'pending' && (
                        <>
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => handleAccessProcess(r.id, 'approve')}
                          >
                            <CheckIcon />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleAccessProcess(r.id, 'reject')}
                          >
                            <CloseIcon />
                          </IconButton>
                        </>
                      )}
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
                {accessRequests.length === 0 && (
                  <Typography color="text.secondary">No access requests</Typography>
                )}
              </List>
            </>
          )}
        </Box>
      )}
    </Box>
  );
}
