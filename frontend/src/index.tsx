import React, { Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, CssBaseline, CircularProgress, Box } from '@mui/material';
import { I18nextProvider } from 'react-i18next';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './app/App';
import theme from './theme';
import i18n from './i18n';
import { AuthProvider } from './app/AuthContext';

const queryClient = new QueryClient();

// number入力にフォーカスがある状態でホイールしても値が変わらないようにする
document.addEventListener('wheel', () => {
  if (document.activeElement instanceof HTMLInputElement &&
      document.activeElement.type === 'number') {
    document.activeElement.blur();
  }
});

const root = createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <I18nextProvider i18n={i18n}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <BrowserRouter>
          <QueryClientProvider client={queryClient}>
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
          </QueryClientProvider>
        </BrowserRouter>
      </ThemeProvider>
    </I18nextProvider>
  </React.StrictMode>
);
