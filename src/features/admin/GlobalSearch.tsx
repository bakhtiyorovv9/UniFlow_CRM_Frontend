'use client';

import Autocomplete from '@mui/material/Autocomplete';
import InputAdornment from '@mui/material/InputAdornment';
import TextField from '@mui/material/TextField';
import { useQuery } from '@tanstack/react-query';
import { GraduationCap, Search, User, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useDebounced } from '../../hooks/useDebounced';
import { useI18n } from '../../i18n/I18nProvider';
import type { MessageKey } from '../../i18n/messages';
import { api } from '../../lib/api';
import type { Group, Student, Teacher } from './api';

type Result = { id: string; label: string; detail: string; to: string; group: MessageKey; icon: typeof User };

async function search(term: string): Promise<Result[]> {
  const params = { search: term, page: 1, limit: 4 };
  const [teachers, groups, students] = await Promise.all([
    api.get<{ items: Teacher[] }>('/teachers', { params }),
    api.get<{ items: Group[] }>('/groups', { params }),
    api.get<{ items: Student[] }>('/students', { params }),
  ]);
  const q = encodeURIComponent(term);
  return [
    ...groups.data.items.map((g) => ({
      id: `g${g.id}`,
      label: g.name,
      detail: g.courses.name,
      to: `/groups?q=${encodeURIComponent(g.name)}`,
      group: 'nav.groups' as const,
      icon: Users,
    })),
    ...teachers.data.items.map((item) => ({
      id: `t${item.id}`,
      label: item.full_name,
      detail: item.phone,
      to: `/teachers?q=${q}`,
      group: 'nav.teachers' as const,
      icon: User,
    })),
    ...students.data.items.map((item) => ({
      id: `s${item.id}`,
      label: item.full_name,
      detail: item.phone,
      to: `/students?q=${q}`,
      group: 'nav.students' as const,
      icon: GraduationCap,
    })),
  ];
}

const SHORTCUT = typeof navigator !== 'undefined' && /mac|iphone|ipad/i.test(navigator.userAgent) ? '⌘K' : 'Ctrl K';

export function GlobalSearch({ autoFocus = false, onDone }: { autoFocus?: boolean; onDone?: () => void }) {
  const { t } = useI18n();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [term, setTerm] = useState('');
  const [open, setOpen] = useState(false);
  const debounced = useDebounced(term.trim(), 250);

  const results = useQuery({
    queryKey: ['global-search', debounced],
    queryFn: () => search(debounced),
    enabled: debounced.length >= 2,
    staleTime: 30_000,
  });

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const pending = term.trim() !== debounced || results.isFetching;

  return (
    <Autocomplete<Result>
      className="w-full max-w-md"
      size="small"
      open={open && term.trim().length >= 2}
      onOpen={() => setOpen(true)}
      onClose={() => setOpen(false)}
      options={results.data ?? []}
      filterOptions={(options) => options}
      groupBy={(option) => t(option.group)}
      getOptionLabel={(option) => option.label}
      isOptionEqualToValue={(option, value) => option.id === value.id}
      value={null}
      inputValue={term}
      onInputChange={(_, value, reason) => {
        if (reason === 'input' || reason === 'clear') setTerm(value);
      }}
      onChange={(_, option) => {
        if (!option) return;
        router.push(option.to);
        setTerm('');
        setOpen(false);
        inputRef.current?.blur();
        onDone?.();
      }}
      loading={pending}
      loadingText={t('search.searching')}
      noOptionsText={t('search.empty')}
      popupIcon={null}
      renderOption={({ key, ...props }, option) => (
        <li key={key} {...props}>
          <div className="flex w-full items-center gap-2.5">
            <option.icon className="size-4 shrink-0 text-muted" aria-hidden />
            <span className="min-w-0 flex-1 truncate text-sm font-medium">{option.label}</span>
            <span className="shrink-0 text-xs text-muted">{option.detail}</span>
          </div>
        </li>
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          inputRef={inputRef}
          autoFocus={autoFocus}
          placeholder={t('search.placeholder')}
          slotProps={{
            ...params.slotProps,
            htmlInput: { ...params.slotProps.htmlInput, 'aria-label': t('search.placeholder') },
            input: {
              ...params.slotProps.input,
              startAdornment: (
                <InputAdornment position="start">
                  <Search className="size-4 text-muted" aria-hidden />
                </InputAdornment>
              ),
              endAdornment: (
                <>
                  <kbd className="pointer-events-none mr-1 hidden rounded border border-border px-1.5 py-0.5 font-sans text-[10px] text-muted sm:block">
                    {SHORTCUT}
                  </kbd>
                  {params.slotProps.input.endAdornment}
                </>
              ),
            },
          }}
        />
      )}
    />
  );
}
