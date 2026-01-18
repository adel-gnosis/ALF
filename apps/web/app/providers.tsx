'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { setTokenProvider } from '@alf/shared';
import { ThemeProvider } from './dashboard/components/layout/ThemeContext';
import { I18nProvider } from '../context/I18nContext';

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 60 * 1000 },
        },
      })
  );

  useEffect(() => {
    // Provide token to axios interceptor in @alf/shared
    setTokenProvider(async () => {
      return localStorage.getItem('alf_access_token'); // you’ll set this on login
    });
  }, []);

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <I18nProvider>{children}</I18nProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
