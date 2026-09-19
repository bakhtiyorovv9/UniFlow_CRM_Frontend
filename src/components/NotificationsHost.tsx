'use client';

import MuiAlert from '@mui/material/Alert';
import Grow from '@mui/material/Grow';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useI18n } from '../i18n/I18nProvider';
import { subscribeNotices, type Notice } from '../lib/notify';

const MAX_VISIBLE = 4;
const DURATION: Record<Notice['kind'], number> = { success: 3500, info: 3500, warning: 5000, error: 6000 };

export function NotificationsHost() {
  const { t } = useI18n();
  const [notices, setNotices] = useState<Notice[]>([]);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setNotices((current) => current.filter((notice) => notice.id !== id));
  }, []);

  useEffect(() => {
    const activeTimers = timers.current;
    const unsubscribe = subscribeNotices((notice) => {
      setNotices((current) => [...current, notice].slice(-MAX_VISIBLE));
      activeTimers.set(notice.id, setTimeout(() => dismiss(notice.id), DURATION[notice.kind]));
    });
    return () => {
      unsubscribe();
      activeTimers.forEach(clearTimeout);
      activeTimers.clear();
    };
  }, [dismiss]);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed top-[72px] right-4 left-4 z-[1500] flex flex-col items-end gap-2 sm:left-auto"
    >
      {notices.map((notice) => (
        <Grow key={notice.id} in appear>
          <MuiAlert
            role={notice.kind === 'error' ? 'alert' : 'status'}
            severity={notice.kind}
            variant="filled"
            onClose={() => dismiss(notice.id)}
            slotProps={{ closeButton: { 'aria-label': t('common.close') } as never }}
            className="pointer-events-auto w-full sm:w-auto sm:max-w-md"
            sx={{ borderRadius: 2, boxShadow: 6, alignItems: 'center', fontWeight: 600 }}
          >
            {notice.message ? t(notice.message, notice.params) : notice.text}
          </MuiAlert>
        </Grow>
      ))}
    </div>
  );
}
