import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { tokenStorage, type Tokens } from './tokens';

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api';

export const API_ORIGIN = API_URL.replace(/\/api\/?$/, '');

export const api = axios.create({ baseURL: API_URL });

export function photoUrl(path?: string | null) {
  if (!path) return undefined;
  return path.startsWith('http') ? path : `${API_ORIGIN}${path}`;
}

export type ApiErrorBody = {
  success: false;
  statusCode: number;
  message: string | string[];
};

const SESSION_EXPIRED_EVENT = 'uniflow:session-expired';

export function onSessionExpired(handler: () => void) {
  window.addEventListener(SESSION_EXPIRED_EVENT, handler);
  return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handler);
}

api.interceptors.request.use((config) => {
  const token = tokenStorage.getAccess();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshing: Promise<string> | null = null;

function refreshTokens(): Promise<string> {
  refreshing ??= (async () => {
    const refresh_token = tokenStorage.getRefresh();
    if (!refresh_token) throw new Error('No refresh token');
    const { data } = await axios.post<Tokens>(`${API_URL}/auth/refresh`, {
      refresh_token,
    });
    tokenStorage.save(data);
    return data.access_token;
  })().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetriableConfig | undefined;
    const isAuthCall = config?.url?.startsWith('/auth/login');

    if (error.response?.status !== 401 || !config || config._retried || isAuthCall) {
      throw error;
    }

    config._retried = true;
    try {
      const token = await refreshTokens();
      config.headers.Authorization = `Bearer ${token}`;
      return api(config);
    } catch {
      tokenStorage.clear();
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
      throw error;
    }
  },
);
