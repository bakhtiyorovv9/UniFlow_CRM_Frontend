import type { MessageKey } from '../i18n/messages';

export type NoticeKind = 'success' | 'error' | 'info' | 'warning';

export type Notice = {
  id: number;
  kind: NoticeKind;
  message?: MessageKey;
  params?: Record<string, string>;
  text?: string;
};

type Listener = (notice: Notice) => void;

const listeners = new Set<Listener>();
let sequence = 0;

function emit(notice: Omit<Notice, 'id'>) {
  const full = { ...notice, id: ++sequence };
  listeners.forEach((listener) => listener(full));
}

export const notify = {
  success: (message: MessageKey, params?: Record<string, string>) => emit({ kind: 'success', message, params }),
  info: (message: MessageKey, params?: Record<string, string>) => emit({ kind: 'info', message, params }),
  warning: (message: MessageKey, params?: Record<string, string>) => emit({ kind: 'warning', message, params }),
  error: (text?: string, fallback: MessageKey = 'error.unknown') =>
    emit(text ? { kind: 'error', text } : { kind: 'error', message: fallback }),
};

export function subscribeNotices(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
