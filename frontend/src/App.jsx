// App.jsx (slim)
import React from 'react';
import { AppProviders } from '@/app/providers';
import { AppRouter } from '@/app/router';

export default function App() {
  return (
    <AppProviders>
      <AppRouter />
    </AppProviders>
  );
}

