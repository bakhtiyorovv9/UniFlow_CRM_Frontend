import type { MessageKey } from '../../../i18n/messages';

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PHONE_PATTERN = /^\+\d{9,15}$/;

export function normalizePhone(value: string) {
  return value.replace(/[\s()-]/g, '');
}

export function phoneError(value: string): MessageKey | undefined {
  const trimmed = normalizePhone(value.trim());
  if (!trimmed) return 'form.required';
  return PHONE_PATTERN.test(trimmed) ? undefined : 'validation.phoneInvalid';
}

export function required(value: string | number | null | undefined): MessageKey | undefined {
  return value === null || value === undefined || String(value).trim() === '' ? 'form.required' : undefined;
}

export function compact<T extends object>(errors: T): T {
  return Object.fromEntries(Object.entries(errors).filter(([, value]) => value)) as T;
}
