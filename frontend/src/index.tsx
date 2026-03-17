import React, { Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, CssBaseline, CircularProgress, Box } from '@mui/material';
import { I18nextProvider } from 'react-i18next';
import App from './app/App';
import theme from './theme';
import i18n from './i18n';
import { AuthProvider } from './app/AuthContext';

const root = createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <I18nextProvider i18n={i18n}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <BrowserRouter>
          <AuthProvider>
            <Suspense
              fallback={
                <Box display="flex" justifyContent="center" mt={8}>
                  <CircularProgress />
                </Box>
              }
            >
              <App />
            </Suspense>
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </I18nextProvider>
  </React.StrictMode>
);
