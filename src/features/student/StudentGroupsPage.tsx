'use client';

import MuiAvatar from '@mui/material/Avatar';
import AvatarGroup from '@mui/material/AvatarGroup';
import ButtonBase from '@mui/material/ButtonBase';
import Chip from '@mui/material/Chip';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import NextLink from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useI18n } from '../../i18n/I18nProvider';
import { photoUrl } from '../../lib/api';
import { WEEK_DAY_SHORT, formatShortDate, initials } from '../../lib/format';
import { WEEK_DAYS, useGroups, type Group } from '../admin/api';
import { Avatar, Card, DataTable, Dialog, PageHeader, StateMessage, TBody, THead, Td, Th, Tr } from '../admin/ui';
import { useUrlState } from '../admin/useUrlState';

type View = 'active' | 'finished';

export function StudentGroupsPage() {
  const { t, lang } = useI18n();
  const router = useRouter();
  const groups = useGroups();
  const [view, setView] = useUrlState<View>('view', 'active');
  const [teachersOf, setTeachersOf] = useState<Group | null>(null);

  const items = (groups.data ?? []).filter((group) =>
    view === 'finished'
      ? group.status === 'completed' || group.status === 'inactive'
      : group.status === 'active' || group.status === 'planned',
  );

  const days = (group: Group) =>
    WEEK_DAYS.map((day, index) => (group.week_day.includes(day) ? WEEK_DAY_SHORT[lang][index] : null))
      .filter(Boolean)
      .join(', ');

  return (
    <div className="space-y-5">
      <PageHeader title={t('nav.myGroups')} />

      <Tabs value={view} onChange={(_, value: View) => setView(value)}>
        <Tab value="active" label={t('myGroups.active')} />
        <Tab value="finished" label={t('myGroups.finished')} />
      </Tabs>

      <Card className="overflow-hidden">
        <DataTable minWidth={760}>
          <THead>
            <Tr>
              <Th className="w-10">#</Th>
              <Th>{t('myGroups.name')}</Th>
              <Th>{t('myGroups.course')}</Th>
              <Th>{t('myGroups.teacher')}</Th>
              <Th>{t('myGroups.time')}</Th>
              <Th>{t('myGroups.start')}</Th>
            </Tr>
          </THead>
          <TBody>
            {items.map((group, index) => {
              const teachers = group.GroupTeacher ?? [];
              return (
                <Tr key={group.id} onClick={() => router.push(`/groups/${group.id}`)}>
                  <Td className="text-muted">{index + 1}</Td>
                  <Td>
                    <NextLink href={`/groups/${group.id}`} className="font-semibold hover:underline">
                      {group.name}
                    </NextLink>
                  </Td>
                  <Td>
                    <Chip size="small" variant="outlined" color="primary" label={group.courses.name} />
                  </Td>
                  <Td>
                    {teachers.length ? (
                      <ButtonBase
                        onClick={() => setTeachersOf(group)}
                        aria-label={`${t('myGroups.showTeachers')}: ${group.name}`}
                        sx={{ borderRadius: 999 }}
                      >
                        <AvatarGroup max={3} sx={{ '& .MuiAvatar-root': { width: 32, height: 32, fontSize: 12 } }}>
                          {teachers.map((link) => (
                            <MuiAvatar key={link.id} src={photoUrl(link.Teacher.photo)} alt="">
                              {initials(link.Teacher.full_name)}
                            </MuiAvatar>
                          ))}
                        </AvatarGroup>
                      </ButtonBase>
                    ) : (
                      '—'
                    )}
                  </Td>
                  <Td>
                    <p className="font-semibold tabular-nums">{group.start_time}</p>
                    <p className="text-xs text-muted">{days(group)}</p>
                  </Td>
                  <Td className="whitespace-nowrap text-fg/85">
                    {formatShortDate(new Date(group.start_date), lang, true)}
                  </Td>
                </Tr>
              );
            })}
          </TBody>
        </DataTable>
        <StateMessage
          loading={groups.isPending}
          error={groups.isError}
          empty={items.length === 0}
          emptyText={view === 'finished' ? t('myGroups.finishedEmpty') : t('myGroups.empty')}
          onRetry={() => groups.refetch()}
        />
      </Card>

      {teachersOf && (
        <Dialog open onClose={() => setTeachersOf(null)} title={teachersOf.name}>
          <div className="overflow-hidden rounded-xl border border-border">
            <DataTable minWidth={480}>
              <THead>
                <Tr>
                  <Th>{t('myGroups.teacher')}</Th>
                  <Th>{t('myGroups.role')}</Th>
                  <Th>{t('myGroups.days')}</Th>
                  <Th>{t('myGroups.time')}</Th>
                </Tr>
              </THead>
              <TBody>
                {(teachersOf.GroupTeacher ?? []).map((link) => (
                  <Tr key={link.id}>
                    <Td>
                      <div className="flex items-center gap-2">
                        <Avatar name={link.Teacher.full_name} photo={link.Teacher.photo} />
                        <span className="font-semibold">{link.Teacher.full_name}</span>
                      </div>
                    </Td>
                    <Td className="text-fg/85">{t('role.TEACHER')}</Td>
                    <Td className="text-fg/85">{days(teachersOf)}</Td>
                    <Td className="tabular-nums text-fg/85">{teachersOf.start_time}</Td>
                  </Tr>
                ))}
              </TBody>
            </DataTable>
          </div>
        </Dialog>
      )}
    </div>
  );
}
