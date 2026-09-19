'use client';

import CircularProgress from '@mui/material/CircularProgress';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { useI18n } from '../../i18n/I18nProvider';
import { useAuth } from './AuthProvider';

function FullScreenLoader() {
  const { t } = useI18n();
  return (
    <div className="grid min-h-dvh place-items-center" role="status">
      <CircularProgress size={28} aria-hidden />
      <span className="sr-only">{t('common.loading')}</span>
    </div>
  );
}

function safeRedirectTarget(value: string | null) {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : '/';
}

export function Redirect({ to }: { to: string }) {
  const router = useRouter();
  useEffect(() => router.replace(to), [router, to]);
  return <FullScreenLoader />;
}

export function ProtectedGuard({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const router = useRouter();

  useEffect(() => {
    if (status !== 'guest') return;
    const from = search ? `${pathname}?${search}` : pathname;
    router.replace(`/login?from=${encodeURIComponent(from)}`);
  }, [status, pathname, search, router]);

  if (status !== 'authenticated') return <FullScreenLoader />;
  return children;
}

export function GuestGuard({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();
  const target = safeRedirectTarget(useSearchParams().get('from'));

  useEffect(() => {
    if (status === 'authenticated') router.replace(target);
  }, [status, target, router]);

  if (status !== 'guest') return <FullScreenLoader />;
  return children;
}
