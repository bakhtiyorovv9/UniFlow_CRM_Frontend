'use client';

import MuiButton from '@mui/material/Button';
import { Archive, ArchiveRestore, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { useI18n } from '../../i18n/I18nProvider';
import { formatPhone, formatShortDate, formatTime } from '../../lib/format';
import { Avatar, Card, RowMenu, StateMessage, DataTable, TBody, THead, Td, Th, Tr } from './ui';
import { useUrlState } from './useUrlState';

export type ArchiveView = 'list' | 'archive';

export function useArchiveView() {
  return useUrlState<ArchiveView>('view', 'list');
}

export function ArchiveButton({ count, onClick }: { count?: number; onClick: () => void }) {
  const { t } = useI18n();
  return (
    <MuiButton
      variant="outlined"
      color="inherit"
      onClick={onClick}
      startIcon={<Archive className="size-4" aria-hidden />}
    >
      {t('archive.button')}
      {count !== undefined && <span className="ml-1.5 text-xs font-medium text-muted">{count}</span>}
    </MuiButton>
  );
}

type ArchivedPerson = {
  id: number;
  full_name: string;
  photo?: string | null;
  phone: string;
  email: string;
  archived_at: string | null;
};

export function ArchiveTable<T extends ArchivedPerson>({
  items,
  personLabel,
  startIndex = 1,
  loading,
  error,
  onRetry,
  onRestore,
  onDelete,
  footer,
}: {
  items: T[];
  personLabel: string;
  startIndex?: number;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  onRestore: (item: T) => void;
  onDelete: (item: T) => void;
  footer?: ReactNode;
}) {
  const { t, lang } = useI18n();

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <DataTable minWidth={720}>
          <THead>
            <Tr>
              <Th className="w-10">#</Th>
              <Th>{personLabel}</Th>
              <Th>{t('col.email')}</Th>
              <Th>{t('col.archivedAt')}</Th>
              <Th className="w-12">
                <span className="sr-only">{t('col.actions')}</span>
              </Th>
            </Tr>
          </THead>
          <TBody>
            {items.map((item, index) => {
              const archivedAt = item.archived_at ? new Date(item.archived_at) : null;
              return (
                <Tr key={item.id}>
                  <Td className="text-muted">{startIndex + index}</Td>
                  <Td>
                    <div className="flex items-center gap-2.5">
                      <Avatar name={item.full_name} tone="neutral" photo={item.photo} />
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{item.full_name}</p>
                        <p className="text-xs text-muted">{formatPhone(item.phone)}</p>
                      </div>
                    </div>
                  </Td>
                  <Td className="text-fg/85">{item.email}</Td>
                  <Td className="whitespace-nowrap text-fg/85">
                    {archivedAt ? `${formatShortDate(archivedAt, lang, true)}, ${formatTime(archivedAt)}` : '—'}
                  </Td>
                  <Td className="text-right">
                    <RowMenu
                      label={`${t('col.actions')}: ${item.full_name}`}
                      items={[
                        { label: t('archive.restore'), icon: ArchiveRestore, onSelect: () => onRestore(item) },
                        {
                          label: t('archive.deleteForever'),
                          icon: Trash2,
                          danger: true,
                          onSelect: () => onDelete(item),
                        },
                      ]}
                    />
                  </Td>
                </Tr>
              );
            })}
          </TBody>
        </DataTable>
      </div>
      <StateMessage
        loading={loading}
        error={error}
        empty={items.length === 0}
        emptyText={t('archive.empty')}
        onRetry={onRetry}
      />
      {footer}
    </Card>
  );
}
