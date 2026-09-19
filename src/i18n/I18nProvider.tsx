'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { readLocal, writeLocal } from '../lib/storage';
import { LANGUAGES, messages, type Language, type MessageKey } from './messages';

const STORAGE_KEY = 'uniflow-lang';

type I18nContextValue = {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: MessageKey, params?: Record<string, string>) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function initialLanguage(): Language {
  const saved = readLocal(STORAGE_KEY);
  return LANGUAGES.includes(saved as Language) ? (saved as Language) : 'uz';
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>(initialLanguage);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((next: Language) => {
    setLangState(next);
    writeLocal(STORAGE_KEY, next);
  }, []);

  const t = useCallback<I18nContextValue['t']>(
    (key, params) =>
      Object.entries(params ?? {}).reduce(
        (text, [name, value]) => text.replaceAll(`{${name}}`, value),
        messages[lang][key],
      ),
    [lang],
  );

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n must be used inside I18nProvider');
  return context;
}
