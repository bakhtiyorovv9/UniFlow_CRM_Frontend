'use client';

import MuiAlert from '@mui/material/Alert';
import MuiIconButton from '@mui/material/IconButton';
import Switch from '@mui/material/Switch';
import Tooltip from '@mui/material/Tooltip';
import { ChevronLeft } from 'lucide-react';
import NextLink from 'next/link';
import { useMemo, useState, type FormEvent } from 'react';
import { useI18n } from '../../i18n/I18nProvider';
import type { MessageKey } from '../../i18n/messages';
import { formatLongDate } from '../../lib/format';
import { dayKey } from '../../lib/schedule';
import {
  useGroupAttendance,
  useGroupDetail,
  useGroupLessons,
  useSaveLessonDay,
  type AttendanceRecord,
} from '../admin/group/groupApi';
import {
  Avatar,
  Badge,
  Button,
  Card,
  DataTable,
  StateMessage,
  TBody,
  THead,
  Td,
  TextField,
  Th,
  Tr,
  type BadgeTone,
} from '../admin/ui';
import { displayName } from '../auth/auth.api';
import { useAuth } from '../auth/AuthProvider';

export function LessonDayPage({ groupId, date }: { groupId: number; date: string }) {
  const { t, lang } = useI18n();
  const { user, role } = useAuth();
  const isAdmin = role === 'ADMIN' || role === 'SUPERADMIN';
  const group = useGroupDetail(groupId);
  const lessons = useGroupLessons(groupId);
  const attendance = useGroupAttendance(groupId);
  const save = useSaveLessonDay();

  const todayKey = dayKey(new Date());
  const isToday = date === todayKey;
  const isFuture = date > todayKey;
  const lesson = useMemo(
    () => [...(lessons.data ?? [])].reverse().find((item) => dayKey(item.created_at) === date),
    [lessons.data, date],
  );
  const records = useMemo(() => {
    const map = new Map<number, AttendanceRecord>();
    [...(attendance.data ?? [])]
      .filter((record) => dayKey(record.created_at) === date)
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .forEach((record) => map.set(record.student_id, record));
    return map;
  }, [attendance.data, date]);

  const [topic, setTopic] = useState<string | null>(null);
  const [description, setDescription] = useState<string | null>(null);
  const [marks, setMarks] = useState<Record<number, boolean>>({});
  const [topicError, setTopicError] = useState<MessageKey | undefined>();

  if (!group.data) {
    return (
      <StateMessage loading={group.isPending} error={group.isError} empty={false} onRetry={() => group.refetch()} />
    );
  }

  const closed = group.data.status === 'completed' || group.data.status === 'inactive';
  const canEdit = isToday && !closed;
  const students = group.data.studentGroups
    .filter((link) => link.status === 'active')
    .map((link) => link.students)
    .sort((a, b) => a.full_name.localeCompare(b.full_name));
  const teacher = group.data.GroupTeacher.find((link) => link.status === 'active')?.Teacher;
  const teacherName = teacher?.full_name ?? (user ? displayName(user) : '—');
  const [year, month, day] = date.split('-').map(Number);
  const dateLabel = formatLongDate(new Date(year, month - 1, day), lang);

  const held = Boolean(lesson) || records.size > 0;
  const status: { label: MessageKey; tone: BadgeTone } = held
    ? { label: 'lessonDay.held', tone: 'success' }
    : isToday
      ? { label: 'lessonDay.todayPending', tone: 'warning' }
      : isFuture
        ? { label: 'lessonDay.upcoming', tone: 'neutral' }
        : { label: 'lessonDay.notHeld', tone: 'danger' };

  const topicValue = topic ?? lesson?.topic ?? '';
  const descriptionValue = description ?? lesson?.description ?? '';
  const present = (studentId: number) => marks[studentId] ?? records.get(studentId)?.isPresent ?? true;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!topicValue.trim()) {
      setTopicError('form.required');
      return;
    }
    const create: { student_id: number; isPresent: boolean }[] = [];
    const update: { id: number; isPresent: boolean }[] = [];
    students.forEach((student) => {
      const value = present(student.id);
      const existing = records.get(student.id);
      if (!existing) create.push({ student_id: student.id, isPresent: value });
      else if (isAdmin && existing.isPresent !== value) update.push({ id: existing.id, isPresent: value });
    });
    save.mutate(
      { groupId, lessonId: lesson?.id, topic: topicValue.trim(), description: descriptionValue.trim(), create, update },
      { onSuccess: () => setMarks({}) },
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex min-w-0 items-center gap-2">
        <Tooltip title={t('group.back')}>
          <MuiIconButton component={NextLink} href={`/groups/${groupId}`} aria-label={t('group.back')}>
            <ChevronLeft className="size-5" aria-hidden />
          </MuiIconButton>
        </Tooltip>
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold tracking-tight">{group.data.name}</h1>
          <p className="text-sm text-muted">{dateLabel}</p>
        </div>
      </div>

      <Card className="p-5">
        <h2 className="text-sm font-bold">{t('lessonDay.info')}</h2>
        <div className="mt-4 flex flex-wrap items-center gap-x-10 gap-y-4">
          <div className="flex items-center gap-3">
            <Avatar name={teacherName} photo={teacher?.photo ?? user?.photo} size={52} />
            <div>
              <p className="font-bold">{teacherName}</p>
              <p className="text-xs text-muted">{t('role.TEACHER')}</p>
            </div>
          </div>
          <div>
            <p className="text-xs text-muted">{t('lessonDay.date')}</p>
            <p className="text-sm font-bold">{dateLabel}</p>
          </div>
          <div>
            <p className="mb-1 text-xs text-muted">{t('lessonDay.status')}</p>
            <Badge tone={status.tone}>{t(status.label)}</Badge>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <form onSubmit={handleSubmit} noValidate>
          <div className="space-y-4 p-5">
            <h2 className="text-base font-bold">{t('lessonDay.form')}</h2>
            {closed && (
              <MuiAlert severity="warning" variant="outlined" sx={{ borderRadius: 2 }}>
                {t('group.closedNotice')}
              </MuiAlert>
            )}
            {!isToday && !closed && (
              <MuiAlert severity="info" variant="outlined" sx={{ borderRadius: 2 }}>
                {t('lessonDay.onlyToday')}
              </MuiAlert>
            )}
            {isToday && !isAdmin && records.size > 0 && (
              <MuiAlert severity="info" variant="outlined" sx={{ borderRadius: 2 }}>
                {t('attendance.lockedForTeacher')}
              </MuiAlert>
            )}
            {!isToday && !held && <p className="text-sm text-muted">{t('lessonDay.nothingRecorded')}</p>}
            {(isToday || held) && (
              <>
                <TextField
                  label={t('lesson.topic')}
                  placeholder={t('lessonDay.topicPlaceholder')}
                  value={topicValue}
                  disabled={!canEdit}
                  onChange={(event) => {
                    setTopic(event.target.value);
                    setTopicError(undefined);
                  }}
                  error={topicError}
                />
                <TextField
                  label={t('lesson.description')}
                  optional
                  placeholder={t('lessonDay.descriptionPlaceholder')}
                  value={descriptionValue}
                  disabled={!canEdit}
                  onChange={(event) => setDescription(event.target.value)}
                />
              </>
            )}
          </div>

          {(isToday || held) && (
            <>
              <DataTable minWidth={420}>
                <THead>
                  <Tr>
                    <Th className="w-10">#</Th>
                    <Th>{t('lessonDay.studentName')}</Th>
                    <Th className="text-right">{t('lessonDay.came')}</Th>
                  </Tr>
                </THead>
                <TBody>
                  {students.map((student, index) => (
                    <Tr key={student.id}>
                      <Td className="text-muted">{index + 1}</Td>
                      <Td>
                        <div className="flex items-center gap-2.5">
                          <Avatar name={student.full_name} tone="neutral" photo={student.photo} />
                          <span className="font-semibold">{student.full_name}</span>
                        </div>
                      </Td>
                      <Td className="text-right">
                        <Switch
                          checked={present(student.id)}
                          disabled={!canEdit || (!isAdmin && records.has(student.id))}
                          onChange={(event) =>
                            setMarks((current) => ({ ...current, [student.id]: event.target.checked }))
                          }
                          color="success"
                          slotProps={{ input: { 'aria-label': `${student.full_name}: ${t('lessonDay.came')}` } }}
                        />
                      </Td>
                    </Tr>
                  ))}
                </TBody>
              </DataTable>
              <StateMessage
                loading={false}
                error={false}
                empty={students.length === 0}
                emptyText={t('groupStudents.empty')}
              />
            </>
          )}

          {canEdit && (
            <div className="flex justify-end border-t border-border px-5 py-4">
              <Button type="submit" loading={save.isPending}>
                {t('common.save')}
              </Button>
            </div>
          )}
        </form>
      </Card>
    </div>
  );
}
