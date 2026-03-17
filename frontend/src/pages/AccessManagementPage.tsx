import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box, Typography, CircularProgress, Alert, Button, TextField, List,
  ListItem, ListItemText, ListItemSecondaryAction, IconButton, Select,
  MenuItem, FormControl, InputLabel, Paper, Divider, Chip,
} from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import { useTranslation } from 'react-i18next';
import api from '../utils/api';

interface AccessRequest {
  id: string; requester_id: string; request_type: string; message: string | null;
  status: string; created_at: string;
}
interface Permission {
  id: string; user_id: string; role: string; granted_at: string;
  user?: { id: string; name: string; email: string };
}

export default function AccessManagementPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [grantUserId, setGrantUserId] = useState('');
  const [grantRole, setGrantRole] = useState<'editor' | 'viewer'>('viewer');

  const load = () => {
    Promise.all([
      api.get(`/projects/${id}/access-requests`),
      api.get(`/projects/${id}/permissions`),
    ]).then(([aRes, pRes]) => {
      setRequests(aRes.data.data.requests);
      setPermissions(pRes.data.data.permissions);
    }).catch(() => setError('Failed to load')).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  const handleProcess = async (reqId: string, action: 'approve' | 'reject') => {
    try {
      await api.post(`/projects/${id}/access-requests/${reqId}`, { action });
      load();
    } catch { alert('Failed'); }
  };

  const handleGrant = async () => {
    if (!grantUserId.trim()) return;
    try {
      await api.post(`/projects/${id}/grant`, { user_id: grantUserId, role: grantRole });
      setGrantUserId('');
      load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to grant';
      alert(msg);
    }
  };

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;

  const statusColor = (s: string) => s === 'approved' ? 'success' : s === 'rejected' ? 'error' : 'warning';

  return (
    <Box>
      <Typography variant="h4" mb={3}>{t('access_management')}</Typography>

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
            <Select value={grantRole} label="Role" onChange={e => setGrantRole(e.target.value as 'editor' | 'viewer')}>
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
              <Chip label={p.role} size="small" color={p.role === 'owner' ? 'primary' : p.role === 'editor' ? 'secondary' : 'default'} />
            </ListItem>
          ))}
          {permissions.length === 0 && <Typography color="text.secondary">No permissions</Typography>}
        </List>
      </Paper>

      <Divider sx={{ my: 3 }} />

      <Typography variant="h6" mb={2}>Access Requests</Typography>
      <List>
        {requests.map(r => (
          <ListItem key={r.id} divider alignItems="flex-start">
            <ListItemText
              primary={`${r.request_type === 'edit' ? 'Edit' : 'View'} request from ${r.requester_id}`}
              secondary={
                <>
                  {r.message && <span>{r.message}<br /></span>}
                  <span>{new Date(r.created_at).toLocaleString()}</span>
                </>
              }
            />
            <ListItemSecondaryAction>
              <Chip label={t(r.status)} size="small" color={statusColor(r.status) as 'success' | 'error' | 'warning'} sx={{ mr: 1 }} />
              {r.status === 'pending' && (
                <>
                  <IconButton size="small" color="success" onClick={() => handleProcess(r.id, 'approve')}>
                    <CheckIcon />
                  </IconButton>
                  <IconButton size="small" color="error" onClick={() => handleProcess(r.id, 'reject')}>
                    <CloseIcon />
                  </IconButton>
                </>
              )}
            </ListItemSecondaryAction>
          </ListItem>
        ))}
        {requests.length === 0 && <Typography color="text.secondary">No access requests</Typography>}
      </List>
    </Box>
  );
}
