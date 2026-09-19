'use client';

import { useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { onSessionExpired } from '../../lib/api';
import { notify } from '../../lib/notify';
import { tokenStorage } from '../../lib/tokens';
import {
  displayName,
  fetchMe,
  login as loginRequest,
  type CurrentUser,
  type LoginPayload,
  type Role,
} from './auth.api';

type AuthStatus = 'loading' | 'authenticated' | 'guest';

type AuthContextValue = {
  status: AuthStatus;
  user: CurrentUser | null;
  role: Role | null;
  login: (payload: LoginPayload, remember: boolean) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function roleFromToken(token: string | null): Role | null {
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload.role ?? null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>(() => (tokenStorage.getRefresh() ? 'loading' : 'guest'));

  const queryClient = useQueryClient();

  const endSession = useCallback(() => {
    tokenStorage.clear();
    queryClient.clear();
    setUser(null);
    setStatus('guest');
  }, [queryClient]);

  const logout = useCallback(() => {
    endSession();
    notify.info('notify.loggedOut');
  }, [endSession]);

  useEffect(
    () =>
      onSessionExpired(() => {
        endSession();
        notify.warning('notify.sessionExpired');
      }),
    [endSession],
  );

  useEffect(() => {
    if (!tokenStorage.getRefresh()) return;
    let cancelled = false;
    fetchMe()
      .then((me) => {
        if (cancelled) return;
        setUser(me);
        setStatus('authenticated');
      })
      .catch(() => {
        if (!cancelled) endSession();
      });
    return () => {
      cancelled = true;
    };
  }, [endSession]);

  const login = useCallback(async (payload: LoginPayload, remember: boolean) => {
    const tokens = await loginRequest(payload);
    tokenStorage.save(tokens, remember);
    try {
      const me = await fetchMe();
      setUser(me);
      setStatus('authenticated');
      notify.success('notify.loggedIn', { name: displayName(me) });
    } catch (error) {
      tokenStorage.clear();
      throw error;
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      role: user ? (user.role ?? roleFromToken(tokenStorage.getAccess())) : null,
      login,
      logout,
    }),
    [status, user, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
