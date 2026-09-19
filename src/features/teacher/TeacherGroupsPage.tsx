'use client';

import Chip from '@mui/material/Chip';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import NextLink from 'next/link';
import { useRouter } from 'next/navigation';
import { useI18n } from '../../i18n/I18nProvider';
import { WEEK_DAY_SHORT, formatShortDate } from '../../lib/format';
import { WEEK_DAYS, useGroups, type Group } from '../admin/api';
import { groupStatus } from '../admin/status';
import { Badge, Card, DataTable, PageHeader, StateMessage, TBody, THead, Td, Th, Tr } from '../admin/ui';
import { useUrlState } from '../admin/useUrlState';

type View = 'current' | 'archive';

export function TeacherGroupsPage() {
  const { t, lang } = useI18n();
  const router = useRouter();
  const groups = useGroups();
  const [status] = useUrlState('status', '');
  const [view, setView] = useUrlState<View>('view', 'current');
  const planned = status === 'planned';

  const items = (groups.data ?? []).filter((group) => {
    if (planned) return group.status === 'planned';
    if (view === 'archive') return group.status === 'completed' || group.status === 'inactive';
    return group.status === 'active';
  });

  const days = (group: Group) =>
    WEEK_DAYS.map((day, index) => (group.week_day.includes(day) ? WEEK_DAY_SHORT[lang][index] : null))
      .filter(Boolean)
      .join(', ');

  const emptyText = planned
    ? t('teacherGroups.plannedEmpty')
    : view === 'archive'
      ? t('teacherGroups.archiveEmpty')
      : t('teacherGroups.empty');

  return (
    <div className="space-y-5">
      <PageHeader title={t(planned ? 'nav.plannedGroups' : 'nav.groups')} />

      {!planned && (
        <ToggleButtonGroup
          exclusive
          size="small"
          value={view}
          onChange={(_, value: View | null) => value && setView(value)}
        >
          <ToggleButton value="current" sx={{ px: 2 }}>
            {t('teacherGroups.active')}
          </ToggleButton>
          <ToggleButton value="archive" sx={{ px: 2 }}>
            {t('teacherGroups.archive')}
          </ToggleButton>
        </ToggleButtonGroup>
      )}

      <Card className="overflow-hidden">
        <DataTable minWidth={880}>
          <THead>
            <Tr>
              <Th>{t('col.status')}</Th>
              <Th mobilePrimary>{t('field.groupName')}</Th>
              <Th>{t('col.course')}</Th>
              <Th>{t('col.startDate')}</Th>
              <Th>{t('col.lessonTime')}</Th>
              <Th>{t('col.room')}</Th>
              <Th className="text-right">{t('col.students')}</Th>
            </Tr>
          </THead>
          <TBody>
            {items.map((group) => {
              const meta = groupStatus[group.status];
              return (
                <Tr key={group.id} onClick={() => router.push(`/groups/${group.id}`)}>
                  <Td>
                    <Badge tone={meta.tone}>{t(meta.label)}</Badge>
                  </Td>
                  <Td>
                    <NextLink href={`/groups/${group.id}`} className="font-semibold hover:underline">
                      {group.name}
                    </NextLink>
                  </Td>
                  <Td>
                    <Chip size="small" variant="outlined" color="primary" label={group.courses.name} />
                  </Td>
                  <Td className="whitespace-nowrap text-fg/85">
                    {formatShortDate(new Date(group.start_date), lang, true)}
                  </Td>
                  <Td>
                    <p className="font-semibold tabular-nums">{group.start_time}</p>
                    <p className="text-xs text-muted">{days(group)}</p>
                  </Td>
                  <Td className="text-fg/85">{group.rooms.name}</Td>
                  <Td className="text-right font-bold tabular-nums">{group._count?.studentGroups ?? 0}</Td>
                </Tr>
              );
            })}
          </TBody>
        </DataTable>
        <StateMessage
          loading={groups.isPending}
          error={groups.isError}
          empty={items.length === 0}
          emptyText={emptyText}
          onRetry={() => groups.refetch()}
        />
      </Card>
    </div>
  );
}
