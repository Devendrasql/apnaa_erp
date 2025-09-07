// src/app/queryClient.js
import { QueryClient } from 'react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0,
      cacheTime: 0,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retry: 0,
      keepPreviousData: false,
    },
    mutations: { retry: 0 },
  },
});

