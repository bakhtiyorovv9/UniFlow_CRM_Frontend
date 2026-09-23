import { api } from '../../lib/api';
import type { Tokens } from '../../lib/tokens';

export type Role = 'SUPERADMIN' | 'ADMIN' | 'TEACHER' | 'STUDENT';

type BaseAccount = {
  id: number;
  email: string;
  phone: string;
  photo: string | null;
  status: string;
  address?: string;
  created_at?: string;
};

export type CurrentUser =
  | (BaseAccount & { first_name: string; last_name: string; role: Role })
  | (BaseAccount & { full_name: string; role?: undefined });

export type LoginPayload = {
  login: string;
  password: string;
};

export async function login(payload: LoginPayload) {
  const { data } = await api.post<Tokens>('/auth/login', payload);
  return data;
}

let pendingMe: Promise<CurrentUser> | null = null;

export function fetchMe() {
  pendingMe ??= api
    .get<CurrentUser>('/auth/me')
    .then((response) => response.data)
    .finally(() => {
      pendingMe = null;
    });
  return pendingMe;
}

export function displayName(user: CurrentUser) {
  return 'full_name' in user ? user.full_name : `${user.first_name} ${user.last_name}`;
}
