import React, { useState } from 'react';
import { Outlet, Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  AppBar, Toolbar, Typography, Button, Box, IconButton, Menu, MenuItem,
  Drawer, List, ListItem, ListItemButton, ListItemText, Divider, Container,
  useTheme, useMediaQuery,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../app/AuthContext';
import i18n from '../../i18n';

export default function Layout() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleUserMenu = (e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget);
  const handleUserMenuClose = () => setAnchorEl(null);

  const handleLogout = () => {
    logout();
    handleUserMenuClose();
    navigate('/');
  };

  const handleLangToggle = () => {
    const next = i18n.language === 'ja' ? 'en' : 'ja';
    i18n.changeLanguage(next);
    localStorage.setItem('locale', next);
  };

  const navItems = [
    { label: t('public_projects'), to: '/' },
    { label: t('search'), to: '/search' },
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static">
        <Toolbar>
          {isMobile && (
            <IconButton color="inherit" onClick={() => setDrawerOpen(true)} sx={{ mr: 1 }}>
              <MenuIcon />
            </IconButton>
          )}
          <Typography
            variant="h6"
            component={RouterLink}
            to="/"
            sx={{ flexGrow: 0, mr: 3, color: 'inherit', textDecoration: 'none' }}
          >
            {t('app_name')}
          </Typography>
          {!isMobile && navItems.map(item => (
            <Button key={item.to} color="inherit" component={RouterLink} to={item.to}>
              {item.label}
            </Button>
          ))}
          <Box sx={{ flexGrow: 1 }} />
          <Button color="inherit" onClick={handleLangToggle} size="small" sx={{ mr: 1 }}>
            {i18n.language === 'ja' ? 'EN' : '日本語'}
          </Button>
          {user ? (
            <>
              <Button
                color="inherit"
                component={RouterLink}
                to="/dashboard"
              >
                {t('dashboard')}
              </Button>
              <IconButton color="inherit" onClick={handleUserMenu}>
                <AccountCircleIcon />
              </IconButton>
              <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleUserMenuClose}>
                <MenuItem disabled>{user.name}</MenuItem>
                <Divider />
                <MenuItem
                  component={RouterLink}
                  to="/settings"
                  onClick={handleUserMenuClose}
                >
                  {t('settings')}
                </MenuItem>
                <MenuItem onClick={handleLogout}>{t('sign_out')}</MenuItem>
              </Menu>
            </>
          ) : (
            <>
              <Button color="inherit" component={RouterLink} to="/signin">{t('sign_in')}</Button>
              <Button
                color="inherit"
                variant="outlined"
                component={RouterLink}
                to="/signup"
                sx={{ ml: 1 }}
              >
                {t('sign_up')}
              </Button>
            </>
          )}
        </Toolbar>
      </AppBar>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <Box sx={{ width: 240 }} onClick={() => setDrawerOpen(false)}>
          <List>
            {navItems.map(item => (
              <ListItem key={item.to} disablePadding>
                <ListItemButton component={RouterLink} to={item.to}>
                  <ListItemText primary={item.label} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>

      <Container component="main" sx={{ flex: 1, py: 3 }}>
        <Outlet />
      </Container>

      <Box
        component="footer"
        sx={{
          py: 2,
          textAlign: 'center',
          bgcolor: 'background.paper',
          borderTop: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Typography variant="body2" color="text.secondary">
          © 2024 PlaLedger
        </Typography>
      </Box>
    </Box>
  );
}
