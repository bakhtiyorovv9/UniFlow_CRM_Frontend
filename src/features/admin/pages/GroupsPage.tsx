'use client';

import { Eye, Pencil, Plus, Trash2 } from 'lucide-react';
import NextLink from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useI18n } from '../../../i18n/I18nProvider';
import { WEEK_DAY_SHORT, addMonths, formatShortDate } from '../../../lib/format';
import { useAdminDialogs } from '../AdminDialogs';
import { WEEK_DAYS, useDeleteEntity, useGroups, type Group, type GroupStatus } from '../api';
import { groupStatus } from '../status';
import {
  Avatar,
  Badge,
  Button,
  Card,
  FilterChips,
  PageHeader,
  ProgressBar,
  RowMenu,
  SearchInput,
  StateMessage,
  DataTable,
  TBody,
  THead,
  Td,
  Th,
  Tr,
} from '../ui';
import { useUrlState } from '../useUrlState';
import { useAuth } from '../../auth/AuthProvider';
import { GroupDeleteDialog } from '../group/GroupDeleteDialog';

type Filter = 'all' | GroupStatus;

export function GroupsPage() {
  const { t, lang } = useI18n();
  const { openGroupForm } = useAdminDialogs();
  const router = useRouter();
  const [filter, setFilter] = useUrlState<Filter>('status', 'all');
  const [query, setQuery] = useUrlState('q', '');
  const [toDelete, setToDelete] = useState<Group | null>(null);
  const remove = useDeleteEntity('/groups');
  const { role } = useAuth();
  const isSuperadmin = role === 'SUPERADMIN';

  const groups = useGroups();

  const rows = useMemo(
    () =>
      (groups.data ?? []).map((group) => {
        const start = new Date(group.start_date);
        return {
          group,
          teacher: group.GroupTeacher?.[0]?.Teacher,
          students: group._count?.studentGroups ?? 0,
          start,
          end: addMonths(start, group.courses.duration_month),
        };
      }),
    [groups.data],
  );

  const counts = useMemo(() => {
    const result: Record<Filter, number> = { all: rows.length, active: 0, planned: 0, completed: 0, inactive: 0 };
    rows.forEach(({ group }) => result[group.status]++);
    return result;
  }, [rows]);

  const q = query.trim().toLowerCase();
  const visible = rows.filter(
    ({ group, teacher }) =>
      (filter === 'all' || group.status === filter) &&
      (!q ||
        group.name.toLowerCase().includes(q) ||
        group.courses.name.toLowerCase().includes(q) ||
        teacher?.full_name.toLowerCase().includes(q)),
  );

  const days = (group: Group) =>
    WEEK_DAYS.map((day, index) => (group.week_day.includes(day) ? WEEK_DAY_SHORT[lang][index] : null))
      .filter(Boolean)
      .join('/');

  return (
    <div className="space-y-5">
      <PageHeader
        title={t('nav.groups')}
        subtitle={
          groups.data &&
          t('groups.summary', {
            active: String(counts.active),
            planned: String(counts.planned),
            completed: String(counts.completed),
          })
        }
        actions={
          <Button icon={Plus} onClick={() => openGroupForm()}>
            {t('add.group')}
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
            { value: 'planned', label: t('status.planned'), count: counts.planned },
            { value: 'completed', label: t('status.completed'), count: counts.completed },
            { value: 'inactive', label: t('status.inactive'), count: counts.inactive },
          ]}
        />
        <SearchInput value={query} onChange={setQuery} placeholder={t('groups.searchPlaceholder')} />
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <DataTable minWidth={900}>
            <THead>
              <Tr>
                <Th>{t('col.group')}</Th>
                <Th>{t('col.teacher')}</Th>
                <Th>{t('col.schedule')}</Th>
                <Th>{t('col.period')}</Th>
                <Th>{t('col.students')}</Th>
                <Th>{t('col.status')}</Th>
                <Th className="w-12">
                  <span className="sr-only">{t('col.actions')}</span>
                </Th>
              </Tr>
            </THead>
            <TBody>
              {visible.map((row) => {
                const status = groupStatus[row.group.status];
                const fill = Math.round((row.students / row.group.max_student) * 100);
                return (
                  <Tr key={row.group.id} onClick={() => router.push(`/groups/${row.group.id}`)}>
                    <Td>
                      <NextLink href={`/groups/${row.group.id}`} className="font-semibold hover:underline">
                        {row.group.name}
                      </NextLink>
                      <p className="text-xs text-muted">
                        {row.group.courses.name} · {row.group.rooms.name}
                      </p>
                    </Td>
                    <Td>
                      {row.teacher ? (
                        <div className="flex items-center gap-2">
                          <Avatar name={row.teacher.full_name} photo={row.teacher.photo} />
                          <span className="text-fg/90">{row.teacher.full_name}</span>
                        </div>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </Td>
                    <Td>
                      <p className="font-semibold tabular-nums">{row.group.start_time}</p>
                      <p className="text-xs text-muted">{days(row.group)}</p>
                    </Td>
                    <Td className="whitespace-nowrap text-fg/85">
                      {formatShortDate(row.start, lang, true)}
                      {row.end && ` – ${formatShortDate(row.end, lang, true)}`}
                    </Td>
                    <Td>
                      <div className="flex items-center gap-2.5">
                        <ProgressBar value={fill} tone="accent" className="w-20" />
                        <span className="font-semibold whitespace-nowrap tabular-nums">
                          {row.students} / {row.group.max_student}
                        </span>
                      </div>
                    </Td>
                    <Td>
                      <Badge tone={status.tone}>{t(status.label)}</Badge>
                    </Td>
                    <Td className="text-right">
                      <RowMenu
                        label={`${t('col.actions')}: ${row.group.name}`}
                        items={[
                          {
                            label: t('group.details'),
                            icon: Eye,
                            onSelect: () => router.push(`/groups/${row.group.id}`),
                          },
                          { label: t('common.edit'), icon: Pencil, onSelect: () => openGroupForm(row.group) },
                          ...(isSuperadmin
                            ? [
                                {
                                  label: t('common.delete'),
                                  icon: Trash2,
                                  danger: true,
                                  onSelect: () => {
                                    remove.reset();
                                    setToDelete(row.group);
                                  },
                                },
                              ]
                            : []),
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
          loading={groups.isPending}
          error={groups.isError}
          empty={visible.length === 0}
          onRetry={() => groups.refetch()}
        />
      </Card>

      {toDelete && (
        <GroupDeleteDialog
          key={toDelete.id}
          name={toDelete.name}
          onClose={() => setToDelete(null)}
          onConfirm={() => remove.mutate(toDelete.id, { onSuccess: () => setToDelete(null) })}
          pending={remove.isPending}
          error={remove.error}
        />
      )}
    </div>
  );
}
