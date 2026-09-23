'use client';

import { Archive, ArrowLeft, Pencil, Plus } from 'lucide-react';
import { useState } from 'react';
import { useI18n } from '../../../i18n/I18nProvider';
import { formatPhone, percent } from '../../../lib/format';
import { useAdminDialogs } from '../AdminDialogs';
import { ArchiveButton, ArchiveTable, useArchiveView } from '../archive';
import {
  useArchiveAction,
  useDeleteEntity,
  useTeacherCounts,
  useTeachersPage,
  type Status,
  type Teacher,
} from '../api';
import { teacherStatus } from '../status';
import {
  Badge,
  Button,
  Card,
  ConfirmDelete,
  ConfirmDialog,
  FilterChips,
  PageHeader,
  Pagination,
  ProgressBar,
  RowMenu,
  SearchInput,
  StateMessage,
  Avatar,
  DataTable,
  TBody,
  THead,
  Td,
  Th,
  Tr,
} from '../ui';
import { useDebouncedUrlSearch, useUrlState } from '../useUrlState';

type Filter = 'all' | Status;

const PAGE_SIZE = 10;

export function TeachersPage() {
  const { t } = useI18n();
  const { openTeacherForm } = useAdminDialogs();
  const [filter, setFilter] = useUrlState<Filter>('status', 'all');
  const { query, input: searchInput, setInput: setSearchInput } = useDebouncedUrlSearch();
  const [pageParam, setPageParam] = useUrlState('page', '1');
  const [view, setView] = useArchiveView();
  const [toArchive, setToArchive] = useState<Teacher | null>(null);
  const [toDelete, setToDelete] = useState<Teacher | null>(null);
  const remove = useDeleteEntity('/teachers');
  const archiveAction = useArchiveAction('/teachers');
  const isArchive = view === 'archive';

  const page = Math.max(1, Number(pageParam) || 1);
  const teachers = useTeachersPage({
    page,
    limit: PAGE_SIZE,
    search: query || undefined,
    status: filter === 'all' || isArchive ? undefined : filter,
    archived: isArchive,
  });
  const counts = useTeacherCounts().data;

  const items = teachers.data?.items ?? [];
  const total = teachers.data?.total ?? 0;
  const pageCount = Math.ceil(total / PAGE_SIZE);
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;

  const paginationFooter = total > 0 && (
    <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
      <p className="text-xs text-muted tabular-nums">
        {from}–{from + items.length - 1} / {total}
      </p>
      <Pagination page={page} pageCount={pageCount} onChange={(next) => setPageParam(String(next))} />
    </footer>
  );

  const confirmDialogs = (
    <>
      <ConfirmDialog
        open={Boolean(toArchive)}
        title={t('archive.confirmTitle', { name: toArchive?.full_name ?? '' })}
        body={t('archive.confirmTeacherBody')}
        confirmLabel={t('archive.action')}
        variant="primary"
        onClose={() => setToArchive(null)}
        onConfirm={() =>
          toArchive &&
          archiveAction.mutate({ id: toArchive.id, action: 'archive' }, { onSuccess: () => setToArchive(null) })
        }
        pending={archiveAction.isPending}
        error={archiveAction.error}
      />
      <ConfirmDelete
        open={Boolean(toDelete)}
        name={toDelete?.full_name ?? ''}
        body={t('delete.teacherBody')}
        onClose={() => setToDelete(null)}
        onConfirm={() => toDelete && remove.mutate(toDelete.id, { onSuccess: () => setToDelete(null) })}
        pending={remove.isPending}
        error={remove.error}
      />
    </>
  );

  if (isArchive) {
    return (
      <div className="space-y-5">
        <PageHeader
          title={t('archive.teachersTitle')}
          subtitle={counts && t('archive.summary', { count: String(counts.archived) })}
          actions={
            <Button variant="secondary" icon={ArrowLeft} onClick={() => setView('list')}>
              {t('archive.back')}
            </Button>
          }
        />
        <div className="flex justify-end">
          <SearchInput value={searchInput} onChange={setSearchInput} placeholder={t('students.searchPlaceholder')} />
        </div>
        <ArchiveTable
          items={items}
          personLabel={t('col.teacher')}
          startIndex={from}
          loading={teachers.isPending}
          error={teachers.isError}
          onRetry={() => teachers.refetch()}
          onRestore={(teacher) => archiveAction.mutate({ id: teacher.id, action: 'restore' })}
          onDelete={(teacher) => {
            remove.reset();
            setToDelete(teacher);
          }}
          footer={paginationFooter}
        />
        {confirmDialogs}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={t('nav.teachers')}
        subtitle={
          counts && t('teachers.summary', { total: String(counts.all), active: String(counts.active) })
        }
        actions={
          <Button icon={Plus} onClick={() => openTeacherForm()}>
            {t('add.teacher')}
          </Button>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <FilterChips
          label={t('col.status')}
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: t('filter.all'), count: counts?.all },
            { value: 'active', label: t('status.active'), count: counts?.active },
            { value: 'freeze', label: t('status.vacation'), count: counts?.freeze },
            { value: 'inactive', label: t('status.inactive'), count: counts?.inactive },
          ]}
        />
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <ArchiveButton count={counts?.archived} onClick={() => setView('archive')} />
          <SearchInput value={searchInput} onChange={setSearchInput} placeholder={t('students.searchPlaceholder')} />
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <DataTable minWidth={860}>
            <THead>
              <Tr>
                <Th className="w-10">#</Th>
                <Th>{t('col.teacher')}</Th>
                <Th>{t('col.courses')}</Th>
                <Th>{t('col.groups')}</Th>
                <Th>{t('col.students')}</Th>
                <Th>{t('col.attendance')}</Th>
                <Th>{t('col.status')}</Th>
                <Th className="w-12">
                  <span className="sr-only">{t('col.actions')}</span>
                </Th>
              </Tr>
            </THead>
            <TBody>
              {items.map((teacher, index) => {
                const status = teacherStatus[teacher.status];
                const courses = teacher.courses.join(', ');
                const rate = percent(teacher.attendance.present, teacher.attendance.total);
                return (
                  <Tr key={teacher.id}>
                    <Td className="text-muted">{from + index}</Td>
                    <Td>
                      <div className="flex items-center gap-2.5">
                        <Avatar name={teacher.full_name} photo={teacher.photo} />
                        <div className="min-w-0">
                          <p className="truncate font-semibold">{teacher.full_name}</p>
                          <p className="text-xs text-muted">{formatPhone(teacher.phone)}</p>
                        </div>
                      </div>
                    </Td>
                    <Td className="max-w-56 truncate text-fg/85" title={courses}>
                      {courses || <span className="text-muted">—</span>}
                    </Td>
                    <Td className="font-semibold tabular-nums">{teacher.groups_count}</Td>
                    <Td className="font-semibold tabular-nums">{teacher.students_count}</Td>
                    <Td>
                      <div className="flex items-center gap-3">
                        <ProgressBar value={rate} className="w-full max-w-52 min-w-24" />
                        <span className="w-10 text-right font-semibold tabular-nums">
                          {rate === null ? '—' : `${rate}%`}
                        </span>
                      </div>
                    </Td>
                    <Td>
                      <Badge tone={status.tone}>{t(status.label)}</Badge>
                    </Td>
                    <Td className="text-right">
                      <RowMenu
                        label={`${t('col.actions')}: ${teacher.full_name}`}
                        items={[
                          { label: t('common.edit'), icon: Pencil, onSelect: () => openTeacherForm(teacher) },
                          {
                            label: t('archive.action'),
                            icon: Archive,
                            onSelect: () => {
                              archiveAction.reset();
                              setToArchive(teacher);
                            },
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
          loading={teachers.isPending}
          error={teachers.isError}
          empty={items.length === 0}
          onRetry={() => teachers.refetch()}
        />
        {paginationFooter}
      </Card>

      {confirmDialogs}
    </div>
  );
}
