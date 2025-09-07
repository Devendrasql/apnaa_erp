// src/app/providers.jsx
import React from 'react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { QueryClientProvider } from 'react-query';
import { Toaster } from 'react-hot-toast';

import { theme } from '@/app/theme';
import { queryClient } from '@/app/queryClient';
import { AuthProvider } from '@/contexts/AuthContext';
import { UiProvider } from '@/contexts/UiContext';

export function AppProviders({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthProvider>
          <UiProvider>
            {children}
            <Toaster position="top-right" />
          </UiProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

