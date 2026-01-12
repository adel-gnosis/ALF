'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { setTokenProvider } from '@alf/shared';

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

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
