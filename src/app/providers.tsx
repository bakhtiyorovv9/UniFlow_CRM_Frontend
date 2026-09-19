'use client';

import { MutationCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { NotificationsHost } from '../components/NotificationsHost';
import { apiErrorMessage } from '../features/admin/ui';
import { notify } from '../lib/notify';
import { Suspense, useEffect, useState, type ReactNode } from 'react';
import { AuthProvider } from '../features/auth/AuthProvider';
import { I18nProvider } from '../i18n/I18nProvider';
import { ThemeProvider } from '../theme/ThemeProvider';

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        mutationCache: new MutationCache({
          onError: (error) =>
            notify.error(
              apiErrorMessage(error, ''),
              isAxiosError(error) && !error.response ? 'error.network' : 'error.unknown',
            ),
        }),
        defaultOptions: {
          queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
        },
      }),
  );
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return (
    <ThemeProvider>
      <I18nProvider>
        <NotificationsHost />
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <Suspense fallback={null}>{children}</Suspense>
          </AuthProvider>
        </QueryClientProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
