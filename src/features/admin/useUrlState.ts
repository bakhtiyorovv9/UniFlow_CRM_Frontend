'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useDebounced } from '../../hooks/useDebounced';

function useReplaceParams() {
  const router = useRouter();
  const pathname = usePathname();

  return useCallback(
    (update: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(window.location.search);
      update(params);
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [router, pathname],
  );
}

export function useUrlState<T extends string = string>(key: string, fallback: NoInfer<T>) {
  const searchParams = useSearchParams();
  const replaceParams = useReplaceParams();
  const value = (searchParams.get(key) as T | null) ?? fallback;

  const setValue = useCallback(
    (next: T) => {
      replaceParams((params) => {
        if (next === fallback || next === '') params.delete(key);
        else params.set(key, next);
        if (key !== 'page') params.delete('page');
      });
    },
    [key, fallback, replaceParams],
  );

  return [value, setValue] as const;
}

export function useDebouncedUrlSearch(key = 'q', delay = 300) {
  const [query, setQuery] = useUrlState(key, '');
  const [input, setInput] = useState(query);
  const debounced = useDebounced(input, delay);
  const lastPushed = useRef(query);

  useEffect(() => {
    const next = debounced.trim();
    if (next === lastPushed.current) return;
    lastPushed.current = next;
    setQuery(next);
  }, [debounced, setQuery]);

  useEffect(() => {
    if (query === lastPushed.current) return;
    lastPushed.current = query;
    setInput(query);
  }, [query]);

  return { query, input, setInput };
}

export function useSetUrlParams() {
  const replaceParams = useReplaceParams();
  return useCallback(
    (values: Record<string, string>) => {
      replaceParams((params) =>
        Object.entries(values).forEach(([key, value]) => (value ? params.set(key, value) : params.delete(key))),
      );
    },
    [replaceParams],
  );
}

export function useClearUrlParams(keys: string[]) {
  const replaceParams = useReplaceParams();
  return useCallback(() => {
    replaceParams((params) => [...keys, 'page'].forEach((key) => params.delete(key)));
  }, [replaceParams, keys]);
}
