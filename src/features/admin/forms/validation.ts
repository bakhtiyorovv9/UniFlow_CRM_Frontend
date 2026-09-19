import type { MessageKey } from '../../../i18n/messages';

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function required(value: string | number | null | undefined): MessageKey | undefined {
  return value === null || value === undefined || String(value).trim() === '' ? 'form.required' : undefined;
}

export function compact<T extends object>(errors: T): T {
  return Object.fromEntries(Object.entries(errors).filter(([, value]) => value)) as T;
}
