import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { CircularProgress, Box } from '@mui/material';
import { useAuth } from './AuthContext';
import Layout from '../components/common/Layout';
import SignInPage from '../pages/SignInPage';
import SignUpPage from '../pages/SignUpPage';
import DashboardPage from '../pages/DashboardPage';
import ProjectCreatePage from '../pages/ProjectCreatePage';
import ProjectViewPage from '../pages/ProjectViewPage';
import PublicProjectsPage from '../pages/PublicProjectsPage';
import SettingsPage from '../pages/SettingsPage';
import SearchPage from '../pages/SearchPage';
import ResetPasswordRequestPage from '../pages/ResetPasswordRequestPage';
import ResetPasswordConfirmPage from '../pages/ResetPasswordConfirmPage';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Box display="flex" justifyContent="center" mt={8}><CircularProgress /></Box>;
  return user ? <>{children}</> : <Navigate to="/signin" replace />;
}

export default function App() {
  const { loading } = useAuth();
  if (loading) return <Box display="flex" justifyContent="center" mt={8}><CircularProgress /></Box>;

  return (
    <Routes>
      <Route path="/signin" element={<SignInPage />} />
      <Route path="/signup" element={<SignUpPage />} />
      <Route path="/reset-password/request" element={<ResetPasswordRequestPage />} />
      <Route path="/reset-password/confirm" element={<ResetPasswordConfirmPage />} />
      <Route path="/" element={<Layout />}>
        <Route index element={<PublicProjectsPage />} />
        <Route path="search" element={<SearchPage />} />
        {/* プロジェクト関連の操作はすべて /projects/:id?tab=<tabName> に統一 */}
        <Route path="projects/:id" element={<ProjectViewPage />} />
        <Route path="dashboard" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
        <Route path="projects/new" element={<PrivateRoute><ProjectCreatePage /></PrivateRoute>} />
        <Route path="settings" element={<PrivateRoute><SettingsPage /></PrivateRoute>} />
      </Route>
    </Routes>
  );
}
