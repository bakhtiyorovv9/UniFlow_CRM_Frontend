'use client';

import MuiAvatar from '@mui/material/Avatar';
import {
  BookOpen,
  CalendarDays,
  CalendarRange,
  Clock,
  Copy,
  Mail,
  MapPin,
  Phone,
  Sparkles,
  Users,
  UsersRound,
  type LucideIcon,
} from 'lucide-react';
import NextLink from 'next/link';
import { useI18n } from '../../i18n/I18nProvider';
import { photoUrl } from '../../lib/api';
import { WEEK_DAY_SHORT, formatPhone, formatShortDate, initials } from '../../lib/format';
import { notify } from '../../lib/notify';
import { WEEK_DAYS, useGroups, type Group } from '../admin/api';
import { groupStatus } from '../admin/status';
import { Badge, Card, IconButton, PageHeader, StateMessage } from '../admin/ui';
import { displayName } from '../auth/auth.api';
import { useAuth } from '../auth/AuthProvider';

function StatTile({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-3.5">
      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent-bg text-accent">
        <Icon className="size-5" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-2xl leading-tight font-bold tabular-nums">{value}</p>
        <p className="truncate text-xs text-muted">{label}</p>
      </div>
    </Card>
  );
}

function ContactRow({
  icon: Icon,
  label,
  value,
  copyable,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  copyable?: string;
}) {
  const { t } = useI18n();

  async function copy() {
    if (!copyable) return;
    try {
      await navigator.clipboard.writeText(copyable);
      notify.success('profile.copied');
    } catch {
      notify.error();
    }
  }

  return (
    <li className="group flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-surface-hover">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-success-bg text-success">
        <Icon className="size-[18px]" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted">{label}</p>
        <p className="truncate text-sm font-semibold">{value}</p>
      </div>
      {copyable && (
        <span className="opacity-60 transition-opacity group-hover:opacity-100">
          <IconButton label={`${t('profile.copy')}: ${label}`} icon={Copy} onClick={copy} />
        </span>
      )}
    </li>
  );
}

function GroupCard({ group, today }: { group: Group; today: boolean }) {
  const { t, lang } = useI18n();
  const status = groupStatus[group.status];
  const days = WEEK_DAYS.map((day, index) => ({ day, label: WEEK_DAY_SHORT[lang][index] }));

  return (
    <NextLink
      href={`/groups/${group.id}`}
      className="group relative flex flex-col gap-3 overflow-hidden rounded-2xl border border-border bg-surface p-4 transition-all hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-primary"
    >
      <span
        className="pointer-events-none absolute -top-10 -right-10 size-28 rounded-full bg-primary/10 transition-transform group-hover:scale-125"
        aria-hidden
      />
      <div className="relative flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-bold">{group.name}</p>
          <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-muted">
            <BookOpen className="size-3.5 shrink-0" aria-hidden />
            {group.courses.name}
          </p>
        </div>
        {today ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-success px-2 py-0.5 text-[11px] font-bold text-white">
            <Sparkles className="size-3" aria-hidden />
            {t('profile.todayLesson')}
          </span>
        ) : (
          <Badge tone={status.tone}>{t(status.label)}</Badge>
        )}
      </div>

      <div className="relative flex items-center gap-1" aria-label={t('myGroups.days')}>
        {days.map(({ day, label }) => {
          const active = group.week_day.includes(day);
          return (
            <span
              key={day}
              className={`grid h-6 flex-1 place-items-center rounded-md text-[10px] font-bold ${
                active ? 'bg-primary text-white' : 'bg-bg text-muted/70'
              }`}
            >
              {label}
            </span>
          );
        })}
      </div>

      <div className="relative flex items-center justify-between text-xs text-muted">
        <span className="inline-flex items-center gap-1.5">
          <Clock className="size-3.5" aria-hidden />
          <span className="font-semibold text-fg tabular-nums">{group.start_time}</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <CalendarDays className="size-3.5" aria-hidden />
          {formatShortDate(new Date(group.start_date), lang, true)}
        </span>
        {group._count && (
          <span className="inline-flex items-center gap-1.5">
            <Users className="size-3.5" aria-hidden />
            {t('profile.studentsCount', { n: String(group._count.studentGroups) })}
          </span>
        )}
      </div>
    </NextLink>
  );
}

export function ProfilePage() {
  const { t, lang } = useI18n();
  const { user, role } = useAuth();
  const isStaff = role === 'ADMIN' || role === 'SUPERADMIN';
  const groups = useGroups();

  if (!user) return null;
  const name = displayName(user);
  const myGroups = (groups.data ?? [])
    .filter((group) => group.status !== 'inactive' && group.status !== 'completed')
    .sort((a, b) => a.name.localeCompare(b.name));
  const todayDay = WEEK_DAYS[(new Date().getDay() + 6) % 7];
  const registered = user.created_at ? new Date(user.created_at) : null;
  const daysOnPlatform = registered ? Math.max(1, Math.ceil((Date.now() - registered.getTime()) / 86_400_000)) : null;
  const weekly = myGroups.reduce((sum, group) => sum + group.week_day.length, 0);
  const students = myGroups.reduce((sum, group) => sum + (group._count?.studentGroups ?? 0), 0);
  const loading = groups.isPending ? '…' : null;

  const stats = [
    { icon: UsersRound, label: t('profile.statGroups'), value: loading ?? String(myGroups.length) },
    ...(role === 'TEACHER'
      ? [{ icon: Users, label: t('profile.statStudents'), value: loading ?? String(students) }]
      : []),
    { icon: CalendarRange, label: t('profile.statWeekly'), value: loading ?? String(weekly) },
    {
      icon: CalendarDays,
      label: t('profile.statDays'),
      value: daysOnPlatform ? t('profile.days', { n: String(daysOnPlatform) }) : '—',
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader title={t('profile.title')} />

      <Card className="overflow-hidden">
        <div className="relative h-36 overflow-hidden bg-gradient-to-br from-primary via-primary to-success-bar sm:h-40">
          <div
            className="absolute inset-0 opacity-25"
            style={{
              backgroundImage: 'radial-gradient(rgb(255 255 255 / 0.5) 1px, transparent 1px)',
              backgroundSize: '18px 18px',
            }}
            aria-hidden
          />
          <span className="absolute -top-16 right-10 size-56 rounded-full bg-white/10" aria-hidden />
          <span className="absolute -bottom-20 right-48 size-40 rounded-full bg-white/10" aria-hidden />
        </div>
        <div className="flex flex-col gap-4 px-6 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-5">
            <MuiAvatar
              src={photoUrl(user.photo)}
              alt=""
              sx={{
                mt: -7,
                width: 112,
                height: 112,
                fontSize: 36,
                fontWeight: 700,
                border: 4,
                borderColor: 'background.paper',
                bgcolor: 'primary.main',
                color: 'common.white',
                boxShadow: 3,
              }}
            >
              {initials(name)}
            </MuiAvatar>
            <div className="min-w-0 sm:pt-4 sm:pb-1">
              <h2 className="truncate text-2xl font-bold tracking-tight">{name}</h2>
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-muted">
                {role && <Badge tone="success">{t(`role.${role}`)}</Badge>}
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-success" aria-hidden />
                  {t('profile.accountActive')}
                </span>
                {registered && (
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays className="size-3.5" aria-hidden />
                    {t('profile.memberSince', { date: formatShortDate(registered, lang, true) })}
                  </span>
                )}
                {isStaff && daysOnPlatform && (
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="size-3.5" aria-hidden />
                    {t('profile.statDays')}: {t('profile.days', { n: String(daysOnPlatform) })}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {!isStaff && (
        <div className={`grid grid-cols-2 gap-3 sm:gap-4 ${stats.length === 4 ? 'xl:grid-cols-4' : 'xl:grid-cols-3'}`}>
          {stats.map((stat) => (
            <StatTile key={stat.label} {...stat} />
          ))}
        </div>
      )}

      <div className={`grid items-start gap-4 ${isStaff ? '' : 'lg:grid-cols-[360px_minmax(0,1fr)]'}`}>
        <Card className="p-4">
          <h3 className="px-2 pb-2 text-sm font-bold">{t('profile.contact')}</h3>
          <ul className={isStaff ? 'grid gap-1 sm:grid-cols-2' : 'space-y-0.5'}>
            <ContactRow icon={Mail} label={t('profile.email')} value={user.email} copyable={user.email} />
            <ContactRow icon={Phone} label={t('profile.phone')} value={formatPhone(user.phone)} copyable={user.phone} />
            <ContactRow icon={MapPin} label={t('profile.address')} value={user.address || '—'} />
            <ContactRow
              icon={CalendarDays}
              label={t('profile.registered')}
              value={registered ? formatShortDate(registered, lang, true) : '—'}
            />
          </ul>
        </Card>

        {!isStaff && (
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold">
                {t('profile.myGroups')} <span className="font-normal text-muted">({myGroups.length})</span>
              </h3>
            </div>
            {myGroups.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {myGroups.map((group) => (
                  <GroupCard key={group.id} group={group} today={group.week_day.includes(todayDay)} />
                ))}
              </div>
            ) : (
              <StateMessage
                loading={groups.isPending}
                error={groups.isError}
                empty
                emptyText={t('profile.noGroups')}
                onRetry={() => groups.refetch()}
              />
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
