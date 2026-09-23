'use client';

import { useMemo } from 'react';
import MuiButton from '@mui/material/Button';
import Link from 'next/link';
import { useI18n } from '../../../i18n/I18nProvider';
import type { MessageKey } from '../../../i18n/messages';
import {
  WEEK_DAY_SHORT,
  formatLongDate,
  formatShortDate,
  formatTime,
  isSameDay,
  percent,
  startOfWeek,
} from '../../../lib/format';
import { useAuth } from '../../auth/AuthProvider';
import {
  WEEK_DAYS,
  useAttendanceRange,
  useGroups,
  useRecentVideos,
  useRecentLessons,
  useStudentCounts,
  useStudentsPage,
  useTeachers,
} from '../api';
import { attendanceRate } from '../derive';
import { studentStatus } from '../status';
import { Avatar, Badge, Card, CardHeader, StateMessage, type BadgeTone } from '../ui';

function greetingKey(hour: number): MessageKey {
  if (hour < 12) return 'greeting.morning';
  if (hour < 18) return 'greeting.day';
  return 'greeting.evening';
}

const RECENT_STUDENTS = 5;
const ACTIVITY_ITEMS = 6;

function minutesOf(time: string) {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

export function DashboardPage() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const now = useMemo(() => new Date(), []);

  const weekStart = useMemo(() => startOfWeek(now).toISOString(), [now]);

  const counts = useStudentCounts();
  const students = useStudentsPage({ page: 1, limit: RECENT_STUDENTS });
  const teachers = useTeachers();
  const groups = useGroups();
  const attendance = useAttendanceRange(weekStart, now.toISOString());
  const lessons = useRecentLessons();
  const videos = useRecentVideos(ACTIVITY_ITEMS);

  const recentStudents = students.data?.items;

  const firstName = user ? ('first_name' in user ? user.first_name : user.full_name.split(' ')[0]) : '';

  const derived = useMemo(() => {
    const allGroups = groups.data ?? [];
    const activeGroups = allGroups.filter((group) => group.status === 'active');
    const seatsUsed = activeGroups.reduce((sum, group) => sum + (group._count?.studentGroups ?? 0), 0);
    const seatsTotal = activeGroups.reduce((sum, group) => sum + group.max_student, 0);

    return {
      activeStudents: counts.data?.active ?? 0,
      newThisMonth: counts.data?.new_this_month ?? 0,
      activeGroups: activeGroups.length,
      plannedGroups: allGroups.filter((group) => group.status === 'planned').length,
      teachersTotal: teachers.data?.length ?? 0,
      teachersActive: (teachers.data ?? []).filter((teacher) => teacher.status === 'active').length,
      seatsUsed,
      seatsTotal,
      occupancy: percent(seatsUsed, seatsTotal),
    };
  }, [counts.data, teachers.data, groups.data]);

  const week = useMemo(() => {
    const monday = startOfWeek(now);
    const records = attendance.data ?? [];
    const days = WEEK_DAYS.map((_, index) => {
      const day = new Date(monday);
      day.setDate(monday.getDate() + index);
      const dayRecords = records.filter((record) => isSameDay(new Date(record.created_at), day));
      return { label: WEEK_DAY_SHORT[lang][index], rate: attendanceRate(dayRecords), isToday: isSameDay(day, now) };
    });
    return { days, average: attendanceRate(records) };
  }, [attendance.data, lang, now]);

  const todayLessons = useMemo(() => {
    const todayKey = WEEK_DAYS[(now.getDay() + 6) % 7];
    const recordedToday = new Set(
      (lessons.data ?? [])
        .filter((lesson) => isSameDay(new Date(lesson.created_at), now))
        .map((lesson) => lesson.group_id),
    );
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    return (groups.data ?? [])
      .filter((group) => group.status === 'active' && group.week_day.includes(todayKey))
      .sort((a, b) => minutesOf(a.start_time) - minutesOf(b.start_time))
      .map((group) => {
        const status: { label: MessageKey; tone: BadgeTone } = recordedToday.has(group.id)
          ? { label: 'lessonStatus.done', tone: 'success' }
          : nowMinutes >= minutesOf(group.start_time)
            ? { label: 'lessonStatus.started', tone: 'warning' }
            : { label: 'lessonStatus.upcoming', tone: 'neutral' };
        return {
          group,
          teacher: group.GroupTeacher?.[0]?.Teacher,
          students: group._count?.studentGroups ?? 0,
          status,
        };
      });
  }, [groups.data, lessons.data, now]);

  const newStudents = useMemo(
    () =>
      (recentStudents ?? []).map((student) => ({
        student,
        group: student.studentGroups?.[0]?.groups.name,
      })),
    [recentStudents],
  );

  const activity = useMemo(() => {
    type Entry = { id: string; text: string; at: Date; tone: 'success' | 'accent' | 'muted' };
    const entries: Entry[] = [
      ...(recentStudents ?? []).map((s) => ({
        id: `s${s.id}`,
        text: t('activity.student', { name: s.full_name }),
        at: new Date(s.created_at),
        tone: 'success' as const,
      })),
      ...(groups.data ?? []).map((g) => ({
        id: `g${g.id}`,
        text: t('activity.group', { name: g.name }),
        at: new Date(g.created_at),
        tone: 'accent' as const,
      })),
      ...(lessons.data ?? []).map((l) => ({
        id: `l${l.id}`,
        text: t('activity.lesson', { group: l.groups.name, topic: l.topic }),
        at: new Date(l.created_at),
        tone: 'accent' as const,
      })),
      ...(videos.data ?? []).map((v) => ({
        id: `v${v.id}`,
        text: t('activity.video', { name: v.originalname }),
        at: new Date(v.created_at),
        tone: 'muted' as const,
      })),
    ];
    return entries.sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, ACTIVITY_ITEMS);
  }, [recentStudents, groups.data, lessons.data, videos.data, t]);

  function relativeTime(date: Date) {
    const minutes = Math.floor((now.getTime() - date.getTime()) / 60_000);
    if (minutes < 1) return t('time.justNow');
    if (minutes < 60) return t('time.minutes', { count: String(minutes) });
    if (isSameDay(date, now)) return t('time.hours', { count: String(Math.floor(minutes / 60)) });
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (isSameDay(date, yesterday)) return t('time.yesterday', { time: formatTime(date) });
    return `${formatShortDate(date, lang)}, ${formatTime(date)}`;
  }

  const statsReady = counts.isSuccess && groups.isSuccess && teachers.isSuccess;

  const stats = [
    {
      label: t('stat.activeStudents'),
      value: derived.activeStudents,
      detail: t('stat.newThisMonth', { count: String(derived.newThisMonth) }),
      detailTone: derived.newThisMonth > 0 ? 'text-success' : 'text-muted',
    },
    {
      label: t('stat.activeGroups'),
      value: derived.activeGroups,
      detail: t('stat.planned', { count: String(derived.plannedGroups) }),
      detailTone: 'text-muted',
    },
    {
      label: t('stat.teachers'),
      value: derived.teachersTotal,
      detail: t('stat.teachersActive', { count: String(derived.teachersActive) }),
      detailTone: 'text-muted',
    },
    {
      label: t('stat.occupancy'),
      value: derived.occupancy === null ? '—' : `${derived.occupancy}%`,
      detail: t('stat.seats', { used: String(derived.seatsUsed), total: String(derived.seatsTotal) }),
      detailTone: 'text-muted',
    },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t(greetingKey(now.getHours()), { name: firstName })}</h1>
        <p className="mt-1 text-sm text-muted">
          {formatLongDate(now, lang)}
          {groups.isSuccess && ` · ${t('dashboard.todaySummary', { count: String(todayLessons.length) })}`}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="px-4 py-4">
            <p className="text-xs font-medium text-muted">{stat.label}</p>
            <p className="mt-2 text-2xl font-bold tracking-tight tabular-nums sm:text-3xl">
              {statsReady ? stat.value : '—'}
            </p>
            <p className={`mt-1.5 text-xs ${stat.detailTone}`}>{statsReady ? stat.detail : ' '}</p>
          </Card>
        ))}
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-[3fr_2fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader
              title={t('attendance.weekly')}
              action={
                <p className="text-sm text-muted">
                  {t('attendance.average')}{' '}
                  <span className="font-bold text-fg">{week.average === null ? '—' : `${week.average}%`}</span>
                </p>
              }
            />
            <div className="px-4 pt-5 pb-3">
              <ol className="grid h-44 grid-cols-7 items-end gap-2 sm:gap-6">
                {week.days.map((day) => (
                  <li key={day.label} className="flex h-full flex-col items-center justify-end gap-1.5">
                    <span className="text-xs font-semibold tabular-nums">
                      {day.rate === null ? '–' : `${day.rate}%`}
                    </span>
                    <span
                      className={`w-full max-w-10 rounded-t-md ${
                        day.rate === null ? 'bg-track' : day.isToday ? 'bg-primary' : 'bg-accent-bg'
                      }`}
                      style={{ height: day.rate === null ? 4 : `${Math.max(day.rate, 4)}%` }}
                    />
                    <span className={`text-xs ${day.isToday ? 'font-bold text-accent' : 'text-muted'}`}>
                      {day.label}
                    </span>
                  </li>
                ))}
              </ol>
              {attendance.isSuccess && week.average === null && (
                <p className="mt-3 text-center text-xs text-muted">{t('attendance.noData')}</p>
              )}
            </div>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader
              title={t('today.title')}
              action={
                <MuiButton component={Link} href="/groups" variant="text" size="small">
                  {t('today.allGroups')}
                </MuiButton>
              }
            />
            {todayLessons.length > 0 ? (
              <ul className="divide-y divide-border text-sm">
                {todayLessons.map((row) => (
                  <li
                    key={row.group.id}
                    className="grid grid-cols-[3.5rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 px-4 py-3 sm:grid-cols-[3.5rem_minmax(0,1.3fr)_minmax(0,1fr)_6rem_auto]"
                  >
                    <span className="font-bold tabular-nums">{row.group.start_time}</span>
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{row.group.name}</p>
                      <p className="truncate text-xs text-muted">
                        {row.group.courses.name} · {row.group.rooms.name}
                      </p>
                    </div>
                    <div className="hidden min-w-0 items-center gap-2 sm:flex">
                      {row.teacher ? (
                        <>
                          <Avatar name={row.teacher.full_name} photo={row.teacher.photo} />
                          <span className="truncate text-sm">{row.teacher.full_name}</span>
                        </>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </div>
                    <span className="hidden text-sm text-muted sm:block">
                      {t('today.students', { count: String(row.students) })}
                    </span>
                    <span className="justify-self-end">
                      <Badge tone={row.status.tone}>{t(row.status.label)}</Badge>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <StateMessage
                loading={groups.isPending}
                error={groups.isError}
                empty
                emptyText={t('today.empty')}
                onRetry={() => groups.refetch()}
              />
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="overflow-hidden">
            <CardHeader title={t('newStudents.title')} />
            {newStudents.length > 0 ? (
              <>
                <ul className="divide-y divide-border">
                  {newStudents.map(({ student, group }) => {
                    const meta = studentStatus[student.status];
                    return (
                      <li key={student.id} className="flex items-center gap-3 px-4 py-3">
                        <Avatar name={student.full_name} tone="neutral" photo={student.photo} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{student.full_name}</p>
                          <p className="truncate text-xs text-muted">{group ?? t('noGroup')}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge tone={meta.tone}>{t(meta.label)}</Badge>
                          <span className="text-xs text-muted">
                            {formatShortDate(new Date(student.created_at), lang)}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
                <div className="border-t border-border py-3 text-center">
                  <MuiButton component={Link} href="/students" variant="text" size="small">
                    {t('newStudents.all')}
                  </MuiButton>
                </div>
              </>
            ) : (
              <StateMessage
                loading={students.isPending}
                error={students.isError}
                empty
                emptyText={t('newStudents.empty')}
                onRetry={() => students.refetch()}
              />
            )}
          </Card>

          <Card>
            <CardHeader title={t('activity.title')} />
            {activity.length > 0 ? (
              <ul className="space-y-4 px-4 py-4">
                {activity.map((entry) => (
                  <li key={entry.id} className="flex gap-3">
                    <span
                      aria-hidden
                      className={`mt-1.5 size-2 shrink-0 rounded-full ${
                        entry.tone === 'success'
                          ? 'bg-success-bar'
                          : entry.tone === 'accent'
                            ? 'bg-primary'
                            : 'bg-muted'
                      }`}
                    />
                    <div className="min-w-0">
                      <p className="text-sm">{entry.text}</p>
                      <p className="mt-0.5 text-xs text-muted">{relativeTime(entry.at)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <StateMessage
                loading={students.isPending || groups.isPending}
                error={false}
                empty
                emptyText={t('activity.empty')}
              />
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
