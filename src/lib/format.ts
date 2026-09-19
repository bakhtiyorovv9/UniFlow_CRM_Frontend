import type { Language } from '../i18n/messages';

const UZ_DAYS = ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'];
const UZ_MONTHS = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'];
const UZ_MONTHS_SHORT = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyn', 'Iyl', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'];

const INTL_LOCALE: Record<Exclude<Language, 'uz'>, string> = { ru: 'ru-RU', en: 'en-US' };

export const WEEK_DAY_SHORT: Record<Language, string[]> = {
  uz: ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'],
  ru: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
  en: ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'],
};

export function formatLongDate(date: Date, lang: Language) {
  if (lang === 'uz') {
    return `${UZ_DAYS[date.getDay()]}, ${date.getDate()} ${UZ_MONTHS[date.getMonth()]} ${date.getFullYear()}`;
  }
  const text = new Intl.DateTimeFormat(INTL_LOCALE[lang], {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function formatShortDate(date: Date, lang: Language, withYear = false) {
  if (lang === 'uz') {
    const base = `${date.getDate()} ${UZ_MONTHS_SHORT[date.getMonth()]}`;
    return withYear ? `${base} ${String(date.getFullYear()).slice(2)}` : base;
  }
  return new Intl.DateTimeFormat(INTL_LOCALE[lang], {
    day: 'numeric',
    month: 'short',
    ...(withYear && { year: '2-digit' }),
  }).format(date);
}

export function formatMoney(value: string | number, lang: Language) {
  return new Intl.NumberFormat(lang === 'en' ? 'en-US' : 'ru-RU').format(Number(value));
}

export function localDateInput(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function dayBoundary(value: string, edge: 'start' | 'end') {
  const [year, month, day] = value.split('-').map(Number);
  const date = edge === 'start' ? new Date(year, month - 1, day, 0, 0, 0, 0) : new Date(year, month - 1, day, 23, 59, 59, 999);
  return date.toISOString();
}

export function formatTime(date: Date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

export function formatPhone(phone: string) {
  const match = phone.replace(/\s+/g, '').match(/^\+998(\d{2})(\d{3})(\d{2})(\d{2})$/);
  return match ? `+998 ${match[1]} ${match[2]} ${match[3]} ${match[4]}` : phone;
}

export function percent(part: number, total: number) {
  return total > 0 ? Math.round((part / total) * 100) : null;
}

export function addMonths(date: Date, months: number) {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

export function startOfWeek(date: Date) {
  const result = new Date(date);
  const offset = (result.getDay() + 6) % 7;
  result.setDate(result.getDate() - offset);
  result.setHours(0, 0, 0, 0);
  return result;
}

export function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function toDateInput(value: string) {
  return value ? value.slice(0, 10) : '';
}
