'use client';

import MuiAlert from '@mui/material/Alert';
import MuiIconButton from '@mui/material/IconButton';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Tooltip from '@mui/material/Tooltip';
import { ChartColumn, ChevronLeft, Pencil } from 'lucide-react';
import NextLink from 'next/link';
import { useState } from 'react';
import { useI18n } from '../../../i18n/I18nProvider';
import type { MessageKey } from '../../../i18n/messages';
import { useAuth } from '../../auth/AuthProvider';
import { useAdminDialogs } from '../AdminDialogs';
import { groupStatus } from '../status';
import { Badge, Button, StateMessage } from '../ui';
import { useUrlState } from '../useUrlState';
import { AttendanceTab } from './AttendanceTab';
import { GroupStatsDialog } from './GroupStatsDialog';
import { InfoTab } from './InfoTab';
import { MaterialsTab } from './MaterialsTab';
import { useGroupAttendance, useGroupDetail, useGroupLessons } from './groupApi';

type TabKey = 'info' | 'materials' | 'attendance';

const TABS: { value: TabKey; label: MessageKey }[] = [
  { value: 'info', label: 'group.tabInfo' },
  { value: 'materials', label: 'group.tabMaterials' },
  { value: 'attendance', label: 'group.tabAttendance' },
];

export function GroupDetailPage({ groupId }: { groupId: number }) {
  const { t } = useI18n();
  const { openGroupForm } = useAdminDialogs();
  const { role } = useAuth();
  const canManage = role === 'ADMIN' || role === 'SUPERADMIN';
  const [tab, setTab] = useUrlState<TabKey>('tab', 'info');
  const group = useGroupDetail(groupId);
  const lessons = useGroupLessons(groupId);
  const attendance = useGroupAttendance(groupId);
  const [statsOpen, setStatsOpen] = useState(false);

  if (!group.data) {
    return (
      <div className="space-y-4">
        <Tooltip title={t('group.back')}>
          <MuiIconButton component={NextLink} href="/groups" aria-label={t('group.back')}>
            <ChevronLeft className="size-5" aria-hidden />
          </MuiIconButton>
        </Tooltip>
        <StateMessage loading={group.isPending} error={group.isError} empty={false} onRetry={() => group.refetch()} />
        {group.isError && <p className="text-center text-sm text-muted">{t('group.notFound')}</p>}
      </div>
    );
  }

  const status = groupStatus[group.data.status];
  const closed = group.data.status === 'completed' || group.data.status === 'inactive';
  const { courses, rooms, GroupTeacher, studentGroups, ...base } = group.data;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Tooltip title={t('group.back')}>
            <MuiIconButton component={NextLink} href="/groups" aria-label={t('group.back')}>
              <ChevronLeft className="size-5" aria-hidden />
            </MuiIconButton>
          </Tooltip>
          <h1 className="truncate text-2xl font-bold tracking-tight">{group.data.name}</h1>
          <Badge tone={status.tone}>{t(status.label)}</Badge>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" icon={ChartColumn} onClick={() => setStatsOpen(true)}>
            {t('group.statistics')}
          </Button>
          {canManage && (
            <Button
              variant="secondary"
              icon={Pencil}
              onClick={() =>
                openGroupForm({
                  ...base,
                  courses: { id: courses.id, name: courses.name },
                  rooms: { id: rooms.id, name: rooms.name },
                })
              }
            >
              {t('common.edit')}
            </Button>
          )}
        </div>
      </div>

      {closed && (
        <MuiAlert severity="warning" variant="outlined" sx={{ borderRadius: 2 }}>
          {t('group.closedNotice')}
        </MuiAlert>
      )}

      <Tabs value={tab} onChange={(_, value: TabKey) => setTab(value)} variant="scrollable" scrollButtons={false}>
        {TABS.map((item) => (
          <Tab key={item.value} value={item.value} label={t(item.label)} />
        ))}
      </Tabs>

      {tab === 'info' && (
        <InfoTab
          group={group.data}
          lessons={lessons.data ?? []}
          attendance={attendance.data ?? []}
          canManage={canManage}
        />
      )}
      {tab === 'materials' && (
        <MaterialsTab
          groupId={groupId}
          lessons={lessons.data ?? []}
          lessonsLoading={lessons.isPending}
          closed={closed}
        />
      )}
      {tab === 'attendance' && (
        <AttendanceTab
          group={group.data}
          attendance={attendance.data ?? []}
          loading={attendance.isPending}
          closed={closed}
        />
      )}
      {statsOpen && (
        <GroupStatsDialog
          group={group.data}
          lessons={lessons.data ?? []}
          attendance={attendance.data ?? []}
          onClose={() => setStatsOpen(false)}
        />
      )}
    </div>
  );
}
