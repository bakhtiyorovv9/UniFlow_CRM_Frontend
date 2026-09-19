'use client';

import { Archive, ArrowLeft, Pencil, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useI18n } from '../../../i18n/I18nProvider';
import { formatPhone } from '../../../lib/format';
import { useAdminDialogs } from '../AdminDialogs';
import { ArchiveButton, ArchiveTable, useArchiveView } from '../archive';
import {
  useArchiveAction,
  useAttendance,
  useDeleteEntity,
  useGroupTeachers,
  useStudentGroups,
  useTeachers,
  type Status,
  type Teacher,
} from '../api';
import { attendanceBy, attendanceRate, studentLinksByGroup, teacherLinksByTeacher } from '../derive';
import { teacherStatus } from '../status';
import {
  Badge,
  Button,
  Card,
  ConfirmDelete,
  ConfirmDialog,
  FilterChips,
  PageHeader,
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
import { useUrlState } from '../useUrlState';

type Filter = 'all' | Status;

function matches(teacher: Teacher, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [teacher.full_name, teacher.email, teacher.phone].some((field) => field.toLowerCase().includes(q));
}

export function TeachersPage() {
  const { t } = useI18n();
  const { openTeacherForm } = useAdminDialogs();
  const [filter, setFilter] = useUrlState<Filter>('status', 'all');
  const [query, setQuery] = useUrlState('q', '');
  const [view, setView] = useArchiveView();
  const [toArchive, setToArchive] = useState<Teacher | null>(null);
  const [toDelete, setToDelete] = useState<Teacher | null>(null);
  const remove = useDeleteEntity('/teachers');
  const archiveAction = useArchiveAction('/teachers');

  const teachers = useTeachers();
  const archived = useTeachers(true);
  const groupTeachers = useGroupTeachers();
  const studentGroups = useStudentGroups();
  const attendance = useAttendance();

  const rows = useMemo(() => {
    const byTeacher = teacherLinksByTeacher(groupTeachers.data);
    const studentsByGroup = studentLinksByGroup(studentGroups.data);
    const attendanceByGroup = attendanceBy(attendance.data, 'group_id');

    return (teachers.data ?? []).map((teacher) => {
      const links = byTeacher.get(teacher.id) ?? [];
      const groupIds = links.map((link) => link.group_id);
      return {
        teacher,
        courses: [...new Set(links.map((link) => link.Group.courses.name))].join(', '),
        groups: links.length,
        students: groupIds.reduce((sum, id) => sum + (studentsByGroup.get(id)?.length ?? 0), 0),
        attendance: attendanceRate(groupIds.flatMap((id) => attendanceByGroup.get(id) ?? [])),
      };
    });
  }, [teachers.data, groupTeachers.data, studentGroups.data, attendance.data]);

  const counts = useMemo(() => {
    const result: Record<Filter, number> = { all: rows.length, active: 0, freeze: 0, inactive: 0 };
    rows.forEach(({ teacher }) => result[teacher.status]++);
    return result;
  }, [rows]);

  const visible = rows.filter(
    ({ teacher }) => (filter === 'all' || teacher.status === filter) && matches(teacher, query),
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

  if (view === 'archive') {
    const archivedItems = (archived.data ?? []).filter((teacher) => matches(teacher, query));
    return (
      <div className="space-y-5">
        <PageHeader
          title={t('archive.teachersTitle')}
          subtitle={archived.data && t('archive.summary', { count: String(archived.data.length) })}
          actions={
            <Button variant="secondary" icon={ArrowLeft} onClick={() => setView('list')}>
              {t('archive.back')}
            </Button>
          }
        />
        <div className="flex justify-end">
          <SearchInput value={query} onChange={setQuery} placeholder={t('students.searchPlaceholder')} />
        </div>
        <ArchiveTable
          items={archivedItems}
          personLabel={t('col.teacher')}
          loading={archived.isPending}
          error={archived.isError}
          onRetry={() => archived.refetch()}
          onRestore={(teacher) => archiveAction.mutate({ id: teacher.id, action: 'restore' })}
          onDelete={(teacher) => {
            remove.reset();
            setToDelete(teacher);
          }}
        />
        {confirmDialogs}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={t('nav.teachers')}
        subtitle={teachers.data && t('teachers.summary', { total: String(counts.all), active: String(counts.active) })}
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
            { value: 'all', label: t('filter.all'), count: counts.all },
            { value: 'active', label: t('status.active'), count: counts.active },
            { value: 'freeze', label: t('status.vacation'), count: counts.freeze },
            { value: 'inactive', label: t('status.inactive'), count: counts.inactive },
          ]}
        />
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <ArchiveButton count={archived.data?.length} onClick={() => setView('archive')} />
          <SearchInput value={query} onChange={setQuery} placeholder={t('students.searchPlaceholder')} />
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
              {visible.map((row, index) => {
                const status = teacherStatus[row.teacher.status];
                return (
                  <Tr key={row.teacher.id}>
                    <Td className="text-muted">{index + 1}</Td>
                    <Td>
                      <div className="flex items-center gap-2.5">
                        <Avatar name={row.teacher.full_name} photo={row.teacher.photo} />
                        <div className="min-w-0">
                          <p className="truncate font-semibold">{row.teacher.full_name}</p>
                          <p className="text-xs text-muted">{formatPhone(row.teacher.phone)}</p>
                        </div>
                      </div>
                    </Td>
                    <Td className="max-w-56 truncate text-fg/85" title={row.courses}>
                      {row.courses || <span className="text-muted">—</span>}
                    </Td>
                    <Td className="font-semibold tabular-nums">{row.groups}</Td>
                    <Td className="font-semibold tabular-nums">{row.students}</Td>
                    <Td>
                      <div className="flex items-center gap-3">
                        <ProgressBar value={row.attendance} className="w-full max-w-52 min-w-24" />
                        <span className="w-10 text-right font-semibold tabular-nums">
                          {row.attendance === null ? '—' : `${row.attendance}%`}
                        </span>
                      </div>
                    </Td>
                    <Td>
                      <Badge tone={status.tone}>{t(status.label)}</Badge>
                    </Td>
                    <Td className="text-right">
                      <RowMenu
                        label={`${t('col.actions')}: ${row.teacher.full_name}`}
                        items={[
                          { label: t('common.edit'), icon: Pencil, onSelect: () => openTeacherForm(row.teacher) },
                          {
                            label: t('archive.action'),
                            icon: Archive,
                            onSelect: () => {
                              archiveAction.reset();
                              setToArchive(row.teacher);
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
          empty={visible.length === 0}
          onRetry={() => teachers.refetch()}
        />
      </Card>

      {confirmDialogs}
    </div>
  );
}
