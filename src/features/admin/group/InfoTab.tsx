'use client';

import Autocomplete from '@mui/material/Autocomplete';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import MuiAvatar from '@mui/material/Avatar';
import MuiButton from '@mui/material/Button';
import MuiIconButton from '@mui/material/IconButton';
import { alpha, useTheme } from '@mui/material/styles';
import MuiTextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import { ChevronLeft, ChevronRight, Plus, UserMinus } from 'lucide-react';
import NextLink from 'next/link';
import { useMemo, useState } from 'react';
import { useI18n } from '../../../i18n/I18nProvider';
import { photoUrl } from '../../../lib/api';
import {
  WEEK_DAY_SHORT,
  formatMoney,
  formatPhone,
  formatShortDate,
  initials,
  isSameDay,
  percent,
} from '../../../lib/format';
import { ageFrom, buildStudyMonths, dayKey, lessonEndTime, type StudyMonth } from '../../../lib/schedule';
import { WEEK_DAYS, useAllStudents, type Lesson, type Student, type StudentGroup } from '../api';
import { studentStatus } from '../status';
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  DataTable,
  Dialog,
  ProgressBar,
  RowMenu,
  StateMessage,
  TBody,
  THead,
  Td,
  Th,
  Tr,
  apiErrorMessage,
} from '../ui';
import { useAddStudentsToGroup, useRemoveStudentLink, type AttendanceRecord, type GroupDetail } from './groupApi';

function ColoredCardHeader({ title }: { title: string }) {
  return (
    <header className="rounded-t-2xl bg-primary px-4 py-3 text-sm font-bold text-white">
      <h2>{title}</h2>
    </header>
  );
}

function ParamRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2 text-sm">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right font-bold tabular-nums">{value}</dd>
    </div>
  );
}

function StudyMonthCalendar({
  month,
  heldDays,
  now,
  groupId,
}: {
  month: StudyMonth;
  heldDays: Set<string>;
  now: Date;
  groupId: number;
}) {
  const { t, lang } = useI18n();
  const theme = useTheme();
  return (
    <ol className="flex flex-wrap gap-2">
      {month.dates.map((date) => {
        const held = heldDays.has(dayKey(date));
        const today = isSameDay(date, now);
        const past = date < now && !today;
        const label = formatShortDate(date, lang).split(' ');
        return (
          <li key={date.toISOString()}>
            <Tooltip
              title={[formatShortDate(date, lang, true), today && t('schedule.today'), held && t('schedule.held')]
                .filter(Boolean)
                .join(' · ')}
            >
              <NextLink
                href={`/groups/${groupId}/lesson/${dayKey(date)}`}
                aria-label={`${t('lessonDay.openDay')}: ${formatShortDate(date, lang, true)}`}
                className="grid h-14 w-14 place-content-center rounded-xl border text-center leading-tight transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                style={{
                  borderColor: today
                    ? theme.palette.primary.main
                    : held
                      ? alpha(theme.palette.success.main, 0.5)
                      : theme.palette.divider,
                  background: today
                    ? theme.palette.primary.main
                    : held
                      ? alpha(theme.palette.success.main, 0.14)
                      : past
                        ? theme.palette.action.hover
                        : 'transparent',
                  color: today
                    ? '#fff'
                    : held
                      ? theme.palette.success.main
                      : past
                        ? theme.palette.text.secondary
                        : theme.palette.text.primary,
                }}
              >
                <span className="text-[11px] font-semibold">{label.slice(1).join(' ')}</span>
                <span className="text-lg font-bold">{label[0]}</span>
              </NextLink>
            </Tooltip>
          </li>
        );
      })}
    </ol>
  );
}

export function InfoTab({
  group,
  lessons,
  attendance,
  canManage,
}: {
  group: GroupDetail;
  lessons: Lesson[];
  attendance: AttendanceRecord[];
  canManage: boolean;
}) {
  const { t, lang } = useI18n();
  const theme = useTheme();
  const now = useMemo(() => new Date(), []);

  const teachers = group.GroupTeacher.filter((link) => link.status === 'active').map((link) => link.Teacher);
  const studentLinks = group.studentGroups.filter((link) => link.status === 'active');
  const months = useMemo(
    () => buildStudyMonths(group.start_date, group.courses.duration_month, group.week_day),
    [group.start_date, group.courses.duration_month, group.week_day],
  );
  const totalLessons = months.reduce((sum, month) => sum + month.dates.length, 0);
  const endTime = lessonEndTime(group.start_time, group.courses.duration_hours, totalLessons);
  const heldDays = useMemo(() => new Set(lessons.map((lesson) => dayKey(lesson.created_at))), [lessons]);
  const currentMonthIndex = Math.max(
    0,
    months.findIndex((month) => now >= month.start && now <= month.end),
  );
  const [monthIndex, setMonthIndex] = useState(currentMonthIndex);
  const [showAll, setShowAll] = useState(false);

  const ages = studentLinks.map((link) => ageFrom(link.students.birth_date, now)).filter((age) => age > 0);
  const avgAge = ages.length ? Math.round(ages.reduce((a, b) => a + b, 0) / ages.length) : '—';
  const periodEnd = months[months.length - 1]?.end;
  const days = WEEK_DAYS.map((day, index) => (group.week_day.includes(day) ? WEEK_DAY_SHORT[lang][index] : null))
    .filter(Boolean)
    .join('/');
  const time = endTime
    ? t('schedule.time', { from: group.start_time, to: endTime })
    : t('schedule.from', { from: group.start_time });
  const period = `${formatShortDate(new Date(group.start_date), lang, true)} – ${periodEnd ? formatShortDate(periodEnd, lang, true) : '—'}`;

  const attendanceByStudent = useMemo(() => {
    const map = new Map<number, AttendanceRecord[]>();
    attendance.forEach((record) => map.set(record.student_id, [...(map.get(record.student_id) ?? []), record]));
    return map;
  }, [attendance]);

  const [adding, setAdding] = useState(false);
  const [toRemove, setToRemove] = useState<StudentGroup | null>(null);
  const remove = useRemoveStudentLink();

  const scheduleRows = teachers.length
    ? teachers.map((teacher) => ({ key: teacher.id, name: teacher.full_name }))
    : [{ key: 0, name: '—' }];

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <ColoredCardHeader title={t('group.mentors')} />
          <div className="flex flex-wrap gap-6 p-5">
            {teachers.length === 0 && <p className="text-sm text-muted">{t('group.noMentors')}</p>}
            {teachers.map((teacher) => (
              <div key={teacher.id} className="flex w-28 flex-col items-center text-center">
                <MuiAvatar
                  src={photoUrl(teacher.photo)}
                  sx={{
                    width: 64,
                    height: 64,
                    fontSize: 20,
                    fontWeight: 700,
                    bgcolor: alpha(theme.palette.primary.main, 0.16),
                    color: theme.palette.accent,
                  }}
                >
                  {initials(teacher.full_name)}
                </MuiAvatar>
                <span className="mt-2 text-xs font-semibold text-success">{t('role.TEACHER')}</span>
                <span className="text-sm font-bold">{teacher.full_name}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="overflow-hidden">
          <ColoredCardHeader title={t('group.params')} />
          <dl className="divide-y divide-border px-5 py-2">
            <ParamRow label={t('param.course')} value={group.courses.name} />
            <ParamRow label={t('param.avgAge')} value={avgAge} />
            <ParamRow label={t('param.capacity')} value={group.max_student} />
            <ParamRow label={t('param.current')} value={studentLinks.length} />
            <ParamRow label={t('param.lessonsPerMonth')} value={months[0]?.dates.length ?? 0} />
            <ParamRow label={t('param.duration')} value={group.courses.duration_month} />
            <ParamRow label={t('param.totalLessons')} value={totalLessons} />
            <ParamRow label={t('param.room')} value={`${group.rooms.name} · ${group.rooms.capacity}`} />
            <ParamRow
              label={t('param.price')}
              value={t('course.price', { amount: formatMoney(group.courses.price, lang) })}
            />
          </dl>
        </Card>
      </div>

      <Card className="p-5">
        <h2 className="text-base font-bold">{t('schedule.title')}</h2>
        <ul className="mt-4 space-y-2">
          {scheduleRows.map((row) => (
            <li
              key={row.key}
              className="grid gap-2 rounded-xl bg-bg px-4 py-3.5 text-sm sm:grid-cols-[1.2fr_1fr_1.2fr_1.4fr_auto] sm:items-center"
            >
              <span className="font-semibold text-accent">{row.name}</span>
              <span>{days}</span>
              <span className="tabular-nums">{time}</span>
              <span>{period}</span>
              <span className="text-muted sm:text-right">
                {group.rooms.name} // {group.rooms.capacity}
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-6 flex items-center gap-3">
          <MuiIconButton
            size="small"
            aria-label={t('schedule.prevMonth')}
            disabled={showAll || monthIndex === 0}
            onClick={() => setMonthIndex((index) => index - 1)}
            sx={{ border: 1, borderColor: 'divider', borderRadius: 999 }}
          >
            <ChevronLeft className="size-4" aria-hidden />
          </MuiIconButton>
          <p className="min-w-32 text-center text-sm font-bold" aria-live="polite">
            {showAll ? t('schedule.showAll') : t('schedule.studyMonth', { n: String(monthIndex + 1) })}
          </p>
          <MuiIconButton
            size="small"
            aria-label={t('schedule.nextMonth')}
            disabled={showAll || monthIndex >= months.length - 1}
            onClick={() => setMonthIndex((index) => index + 1)}
            sx={{ border: 1, borderColor: 'divider', borderRadius: 999 }}
          >
            <ChevronRight className="size-4" aria-hidden />
          </MuiIconButton>
        </div>

        <div className="mt-4 space-y-5">
          {(showAll ? months : months.slice(monthIndex, monthIndex + 1)).map((month) => (
            <section key={month.index}>
              {showAll && (
                <h3 className="mb-2 text-xs font-semibold text-muted">
                  {t('schedule.studyMonth', { n: String(month.index) })}
                </h3>
              )}
              <StudyMonthCalendar month={month} heldDays={heldDays} now={now} groupId={group.id} />
            </section>
          ))}
        </div>

        <div className="mt-5 flex justify-center">
          <MuiButton variant="outlined" color="inherit" onClick={() => setShowAll((value) => !value)}>
            {t(showAll ? 'schedule.showLess' : 'schedule.showAll')}
          </MuiButton>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <h2 className="text-base font-bold">{t('groupStudents.title')}</h2>
            <p className="mt-0.5 text-xs text-muted">
              {studentLinks.length} / {group.max_student}
            </p>
          </div>
          {canManage && (
            <Button icon={Plus} onClick={() => setAdding(true)} disabled={studentLinks.length >= group.max_student}>
              {t('groupStudents.add')}
            </Button>
          )}
        </header>
        <DataTable minWidth={720}>
          <THead>
            <Tr>
              <Th className="w-10">#</Th>
              <Th>{t('col.student')}</Th>
              <Th>{t('col.phone')}</Th>
              <Th>{t('groupStudents.joined')}</Th>
              <Th>{t('col.attendance')}</Th>
              <Th>{t('col.status')}</Th>
              <Th className="w-12">
                <span className="sr-only">{t('col.actions')}</span>
              </Th>
            </Tr>
          </THead>
          <TBody>
            {studentLinks.map((link, index) => {
              const records = attendanceByStudent.get(link.student_id) ?? [];
              const rate = percent(records.filter((record) => record.isPresent).length, records.length);
              const meta = studentStatus[link.students.status];
              return (
                <Tr key={link.id}>
                  <Td className="text-muted">{index + 1}</Td>
                  <Td>
                    <div className="flex items-center gap-2.5">
                      <Avatar name={link.students.full_name} tone="neutral" photo={link.students.photo} />
                      {canManage ? (
                        <NextLink
                          href={`/students?q=${encodeURIComponent(link.students.full_name)}`}
                          className="font-semibold hover:underline"
                        >
                          {link.students.full_name}
                        </NextLink>
                      ) : (
                        <span className="font-semibold">{link.students.full_name}</span>
                      )}
                    </div>
                  </Td>
                  <Td className="whitespace-nowrap text-fg/85 tabular-nums">{formatPhone(link.students.phone)}</Td>
                  <Td className="whitespace-nowrap text-fg/85">
                    {formatShortDate(new Date(link.created_at), lang, true)}
                  </Td>
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
                    {canManage && (
                      <RowMenu
                        label={`${t('col.actions')}: ${link.students.full_name}`}
                        items={[
                          {
                            label: t('groupStudents.remove'),
                            icon: UserMinus,
                            danger: true,
                            onSelect: () => {
                              remove.reset();
                              setToRemove(link);
                            },
                          },
                        ]}
                      />
                    )}
                  </Td>
                </Tr>
              );
            })}
          </TBody>
        </DataTable>
        <StateMessage
          loading={false}
          error={false}
          empty={studentLinks.length === 0}
          emptyText={t('groupStudents.empty')}
        />
      </Card>

      {adding && (
        <AddStudentDialog
          groupId={group.id}
          memberIds={new Set(studentLinks.map((link) => link.student_id))}
          freeSlots={Math.max(0, group.max_student - studentLinks.length)}
          onClose={() => setAdding(false)}
        />
      )}

      <ConfirmDialog
        open={Boolean(toRemove)}
        title={t('groupStudents.removeTitle', { name: toRemove?.students.full_name ?? '' })}
        body={t('groupStudents.removeBody')}
        confirmLabel={t('groupStudents.remove')}
        onClose={() => setToRemove(null)}
        onConfirm={() => toRemove && remove.mutate(toRemove.id, { onSuccess: () => setToRemove(null) })}
        pending={remove.isPending}
        error={remove.error}
      />
    </div>
  );
}

function AddStudentDialog({
  groupId,
  memberIds,
  freeSlots,
  onClose,
}: {
  groupId: number;
  memberIds: Set<number>;
  freeSlots: number;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const students = useAllStudents();
  const add = useAddStudentsToGroup();
  const [selected, setSelected] = useState<Student[]>([]);
  const options = (students.data ?? [])
    .filter((student) => !memberIds.has(student.id) && student.status === 'active')
    .sort((a, b) => a.full_name.localeCompare(b.full_name));
  const tooMany = selected.length > freeSlots;

  return (
    <Dialog
      open
      onClose={onClose}
      title={t('groupStudents.addMany')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button
            loading={add.isPending}
            disabled={selected.length === 0 || tooMany}
            onClick={() =>
              add.mutate({ groupId, studentIds: selected.map((student) => student.id) }, { onSuccess: onClose })
            }
          >
            {selected.length > 1 ? `${t('common.save')} (${selected.length})` : t('common.save')}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        {add.error ? <Alert>{apiErrorMessage(add.error, t('error.unknown'))}</Alert> : null}
        {tooMany && <Alert>{t('groupStudents.tooMany')}</Alert>}
        <Autocomplete
          multiple
          disableCloseOnSelect
          size="small"
          options={options}
          loading={students.isPending}
          value={selected}
          onChange={(_, value) => setSelected(value)}
          getOptionLabel={(student) => student.full_name}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          renderOption={({ key, ...props }, student, { selected: isSelected }) => (
            <li key={key} {...props}>
              <div className="flex w-full items-center gap-2.5">
                <Checkbox size="small" checked={isSelected} sx={{ p: 0.5 }} />
                <span className="min-w-0 flex-1 truncate font-medium">{student.full_name}</span>
                <span className="shrink-0 text-xs text-muted">{student.phone}</span>
              </div>
            </li>
          )}
          renderValue={(value, getItemProps) =>
            value.map((student, index) => {
              const { key, ...chipProps } = getItemProps({ index });
              return <Chip key={key} {...chipProps} size="small" label={student.full_name} />;
            })
          }
          noOptionsText={options.length === 0 ? t('groupStudents.noneLeft') : t('search.empty')}
          loadingText={t('common.loading')}
          renderInput={(params) => (
            <MuiTextField
              {...params}
              autoFocus
              placeholder={selected.length ? undefined : t('groupStudents.selectMany')}
              helperText={`${t('groupStudents.freeSlots', { n: String(Math.max(0, freeSlots - selected.length)) })}${
                selected.length ? ` · ${t('groupStudents.selected', { n: String(selected.length) })}` : ''
              }`}
              slotProps={{
                ...params.slotProps,
                htmlInput: { ...params.slotProps.htmlInput, 'aria-label': t('groupStudents.selectMany') },
              }}
            />
          )}
        />
      </div>
    </Dialog>
  );
}
