'use client';

import { Archive, ArrowLeft, Download, Pencil, Plus, Wallet } from 'lucide-react';
import { useState } from 'react';
import { useI18n } from '../../../i18n/I18nProvider';
import { formatPhone, percent, toDateInput } from '../../../lib/format';
import { notify } from '../../../lib/notify';
import { useAdminDialogs } from '../AdminDialogs';
import { ArchiveButton, ArchiveTable, useArchiveView } from '../archive';
import {
  fetchAll,
  useArchiveAction,
  useDeleteEntity,
  useStudentCounts,
  useStudentsPage,
  type Student,
  type StudentStatus,
} from '../api';
import { studentStatus } from '../status';
import {
  Avatar,
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
  apiErrorMessage,
  DataTable,
  TBody,
  THead,
  Td,
  Th,
  Tr,
} from '../ui';
import { useDebouncedUrlSearch, useUrlState } from '../useUrlState';

type Filter = 'all' | StudentStatus;

const PAGE_SIZE = 10;

function csvCell(value: string) {
  return /[",\n;]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function StudentsPage() {
  const { t } = useI18n();
  const { openStudentForm, openPaymentForm } = useAdminDialogs();
  const [filter, setFilter] = useUrlState<Filter>('status', 'all');
  const { query, input: searchInput, setInput: setSearchInput } = useDebouncedUrlSearch();
  const [pageParam, setPageParam] = useUrlState('page', '1');
  const [view, setView] = useArchiveView();
  const [toArchive, setToArchive] = useState<Student | null>(null);
  const [toDelete, setToDelete] = useState<Student | null>(null);
  const [exporting, setExporting] = useState(false);
  const remove = useDeleteEntity('/students');
  const archiveAction = useArchiveAction('/students');
  const isArchive = view === 'archive';

  const page = Math.max(1, Number(pageParam) || 1);
  const status = filter === 'all' || isArchive ? undefined : filter;
  const students = useStudentsPage({
    page,
    limit: PAGE_SIZE,
    search: query || undefined,
    status,
    archived: isArchive,
  });
  const counts = useStudentCounts().data;
  const archivedCount = counts?.archived;

  const items = students.data?.items ?? [];
  const total = students.data?.total ?? 0;
  const pageCount = Math.ceil(total / PAGE_SIZE);
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;

  const groupNames = (student: Student) => (student.studentGroups ?? []).map((link) => link.groups.name);

  async function exportCsv() {
    setExporting(true);
    try {
      const all = await fetchAll<Student>('/students', { search: query || undefined, status });
      const header = [
        t('field.fullName'),
        t('field.phone'),
        t('field.email'),
        t('field.birthDate'),
        t('col.groups'),
        t('col.status'),
      ];
      const lines = all.map((student) =>
        [
          student.full_name,
          student.phone,
          student.email,
          toDateInput(student.birth_date),
          groupNames(student).join('; '),
          t(studentStatus[student.status].label),
        ]
          .map(csvCell)
          .join(','),
      );
      const blob = new Blob([`\uFEFF${[header.map(csvCell).join(','), ...lines].join('\n')}`], {
        type: 'text/csv;charset=utf-8',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `talabalar-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      notify.success('notify.exported', { count: String(all.length) });
    } catch (error) {
      notify.error(apiErrorMessage(error, ''), 'error.unknown');
    } finally {
      setExporting(false);
    }
  }

  const summaryReady = counts !== undefined;

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
        body={t('archive.confirmStudentBody')}
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
        body={t('delete.studentBody')}
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
          title={t('archive.studentsTitle')}
          subtitle={archivedCount !== undefined && t('archive.summary', { count: String(archivedCount) })}
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
          personLabel={t('col.student')}
          startIndex={from}
          loading={students.isPending}
          error={students.isError}
          onRetry={() => students.refetch()}
          onRestore={(student) => archiveAction.mutate({ id: student.id, action: 'restore' })}
          onDelete={(student) => {
            remove.reset();
            setToDelete(student);
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
        title={t('nav.students')}
        subtitle={
          summaryReady &&
          t('students.summary', {
            total: String(counts?.all ?? 0),
            active: String(counts?.active ?? 0),
            graduated: String(counts?.graduated ?? 0),
          })
        }
        actions={
          <>
            <Button variant="secondary" icon={Download} loading={exporting} onClick={exportCsv} disabled={total === 0}>
              {t('students.export')}
            </Button>
            <Button icon={Plus} onClick={() => openStudentForm()}>
              {t('add.student')}
            </Button>
          </>
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
            { value: 'freeze', label: t('status.freeze'), count: counts?.freeze },
            { value: 'inactive', label: t('status.inactive'), count: counts?.inactive },
            { value: 'graduated', label: t('status.graduated'), count: counts?.graduated },
          ]}
        />
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <ArchiveButton count={archivedCount} onClick={() => setView('archive')} />
          <SearchInput value={searchInput} onChange={setSearchInput} placeholder={t('students.searchPlaceholder')} />
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <DataTable minWidth={860}>
            <THead>
              <Tr>
                <Th className="w-10">#</Th>
                <Th>{t('col.student')}</Th>
                <Th>{t('col.group')}</Th>
                <Th>{t('col.phone')}</Th>
                <Th>{t('col.attendance')}</Th>
                <Th>{t('col.status')}</Th>
                <Th className="w-12">
                  <span className="sr-only">{t('col.actions')}</span>
                </Th>
              </Tr>
            </THead>
            <TBody className={`transition-opacity ${students.isPlaceholderData ? 'opacity-60' : ''}`}>
              {items.map((student, index) => {
                const meta = studentStatus[student.status];
                const groups = groupNames(student);
                const rate = percent(student.attendance?.present ?? 0, student.attendance?.total ?? 0);
                return (
                  <Tr key={student.id}>
                    <Td className="text-muted">{from + index}</Td>
                    <Td>
                      <div className="flex items-center gap-2.5">
                        <Avatar name={student.full_name} tone="neutral" photo={student.photo} />
                        <span className="font-semibold">{student.full_name}</span>
                      </div>
                    </Td>
                    <Td className="text-fg/85">
                      {groups.length ? (
                        <>
                          {groups[0]}
                          {groups.length > 1 && <span className="ml-1 text-xs text-muted">+{groups.length - 1}</span>}
                        </>
                      ) : (
                        <span className="text-muted">{t('noGroup')}</span>
                      )}
                    </Td>
                    <Td className="whitespace-nowrap text-fg/85 tabular-nums">{formatPhone(student.phone)}</Td>
                    <Td>
                      <div className="flex items-center gap-3">
                        <ProgressBar value={rate} className="w-20" />
                        <span className="w-10 text-right font-semibold tabular-nums">
                          {rate === null ? '—' : `${rate}%`}
                        </span>
                      </div>
                    </Td>
                    <Td>
                      <Badge tone={meta.tone}>{t(meta.label)}</Badge>
                    </Td>
                    <Td className="text-right">
                      <RowMenu
                        label={`${t('col.actions')}: ${student.full_name}`}
                        items={[
                          {
                            label: t('payments.receive'),
                            icon: Wallet,
                            onSelect: () => openPaymentForm(undefined, { studentId: student.id }),
                          },
                          { label: t('common.edit'), icon: Pencil, onSelect: () => openStudentForm(student) },
                          {
                            label: t('archive.action'),
                            icon: Archive,
                            onSelect: () => {
                              archiveAction.reset();
                              setToArchive(student);
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
          loading={students.isPending}
          error={students.isError}
          empty={items.length === 0}
          onRetry={() => students.refetch()}
        />
        {paginationFooter}
      </Card>

      {confirmDialogs}
    </div>
  );
}
