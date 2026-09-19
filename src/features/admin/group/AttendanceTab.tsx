'use client';

import MuiAlert from '@mui/material/Alert';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Tooltip from '@mui/material/Tooltip';
import { Check, CheckCheck, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useI18n } from '../../../i18n/I18nProvider';
import { formatLongDate, formatShortDate, percent } from '../../../lib/format';
import { dayKey } from '../../../lib/schedule';
import { useAuth } from '../../auth/AuthProvider';
import { WEEK_DAYS } from '../api';
import { Alert, Avatar, Button, Card, DataTable, StateMessage, TBody, THead, Td, Th, Tr, apiErrorMessage } from '../ui';
import { useSaveAttendance, type AttendanceRecord, type GroupDetail } from './groupApi';

export function AttendanceTab({
  group,
  attendance,
  loading,
  closed = false,
}: {
  group: GroupDetail;
  attendance: AttendanceRecord[];
  loading: boolean;
  closed?: boolean;
}) {
  const { t, lang } = useI18n();
  const { role } = useAuth();
  const isAdmin = role === 'ADMIN' || role === 'SUPERADMIN';
  const now = useMemo(() => new Date(), []);
  const todayKey = dayKey(now);
  const isLessonDay = group.week_day.includes(WEEK_DAYS[(now.getDay() + 6) % 7]);
  const students = group.studentGroups
    .filter((link) => link.status === 'active')
    .map((link) => link.students)
    .sort((a, b) => a.full_name.localeCompare(b.full_name));

  const todayRecords = useMemo(() => {
    const map = new Map<number, AttendanceRecord>();
    [...attendance]
      .filter((record) => dayKey(record.created_at) === todayKey)
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .forEach((record) => map.set(record.student_id, record));
    return map;
  }, [attendance, todayKey]);

  const [marks, setMarks] = useState<Record<number, boolean>>({});
  const [saved, setSaved] = useState(false);
  const save = useSaveAttendance();
  const locked = (studentId: number) => !isAdmin && todayRecords.has(studentId);
  const editable = students.filter((student) => !locked(student.id));
  const markFor = (studentId: number) => marks[studentId] ?? todayRecords.get(studentId)?.isPresent ?? true;

  function setMark(studentId: number, present: boolean) {
    if (locked(studentId)) return;
    setSaved(false);
    setMarks((current) => ({ ...current, [studentId]: present }));
  }

  function handleSave() {
    const create: { student_id: number; isPresent: boolean }[] = [];
    const update: { id: number; isPresent: boolean }[] = [];
    students.forEach((student) => {
      const present = markFor(student.id);
      const existing = todayRecords.get(student.id);
      if (!existing) create.push({ student_id: student.id, isPresent: present });
      else if (isAdmin && existing.isPresent !== present) update.push({ id: existing.id, isPresent: present });
    });
    save.mutate(
      { groupId: group.id, create, update },
      {
        onSuccess: () => {
          setMarks({});
          setSaved(true);
        },
      },
    );
  }

  const journal = useMemo(() => {
    const dates = [...new Set(attendance.map((record) => dayKey(record.created_at)))].sort();
    const cells = new Map<string, AttendanceRecord>();
    [...attendance]
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .forEach((record) => cells.set(`${record.student_id}:${dayKey(record.created_at)}`, record));
    return { dates, cells };
  }, [attendance]);

  const presentCount = students.filter((student) => markFor(student.id)).length;

  return (
    <div className="space-y-5">
      {!closed && (
        <Card className="overflow-hidden">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
            <div>
              <h2 className="text-base font-bold">{t('attendance.today')}</h2>
              <p className="mt-0.5 text-xs text-muted">
                {formatLongDate(now, lang)} · {presentCount} / {students.length}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                icon={CheckCheck}
                disabled={editable.length === 0}
                onClick={() => {
                  setSaved(false);
                  setMarks(Object.fromEntries(editable.map((student) => [student.id, true])));
                }}
              >
                {t('attendance.allPresent')}
              </Button>
              <Button loading={save.isPending} disabled={editable.length === 0} onClick={handleSave}>
                {t('attendance.save')}
              </Button>
            </div>
          </header>

          <div className="space-y-3 px-5 pt-4">
            {!isLessonDay && (
              <MuiAlert severity="info" variant="outlined" sx={{ borderRadius: 2 }}>
                {t('attendance.notLessonDay')}
              </MuiAlert>
            )}
            {todayRecords.size > 0 && !isAdmin && (
              <MuiAlert severity="info" variant="outlined" sx={{ borderRadius: 2 }}>
                {t('attendance.lockedForTeacher')}
              </MuiAlert>
            )}
            {todayRecords.size > 0 && isAdmin && !saved && (
              <MuiAlert severity="success" variant="outlined" sx={{ borderRadius: 2 }}>
                {t('attendance.recorded')}
              </MuiAlert>
            )}
            {save.error ? <Alert>{apiErrorMessage(save.error, t('error.unknown'))}</Alert> : null}
          </div>

          <ul className="divide-y divide-border px-5 py-2">
            {students.map((student) => {
              const present = markFor(student.id);
              return (
                <li key={student.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <Avatar name={student.full_name} tone="neutral" photo={student.photo} />
                    <span className="truncate text-sm font-semibold">{student.full_name}</span>
                  </div>
                  <ToggleButtonGroup
                    exclusive
                    size="small"
                    disabled={locked(student.id)}
                    value={present ? 'present' : 'absent'}
                    onChange={(_, value: 'present' | 'absent' | null) =>
                      value && setMark(student.id, value === 'present')
                    }
                    aria-label={student.full_name}
                  >
                    <ToggleButton
                      value="present"
                      sx={{
                        gap: 0.75,
                        px: 1.5,
                        '&.Mui-selected': {
                          color: 'success.main',
                          borderColor: 'success.main',
                          bgcolor: 'transparent',
                        },
                      }}
                    >
                      <Check className="size-4" aria-hidden />
                      {t('attendance.present')}
                    </ToggleButton>
                    <ToggleButton
                      value="absent"
                      sx={{
                        gap: 0.75,
                        px: 1.5,
                        '&.Mui-selected': { color: 'error.main', borderColor: 'error.main', bgcolor: 'transparent' },
                      }}
                    >
                      <X className="size-4" aria-hidden />
                      {t('attendance.absent')}
                    </ToggleButton>
                  </ToggleButtonGroup>
                </li>
              );
            })}
          </ul>
          <StateMessage
            loading={false}
            error={false}
            empty={students.length === 0}
            emptyText={t('groupStudents.empty')}
          />
        </Card>
      )}

      <Card className="overflow-hidden">
        <header className="border-b border-border px-5 py-4">
          <h2 className="text-base font-bold">{t('attendance.journal')}</h2>
        </header>
        {journal.dates.length > 0 && students.length > 0 && (
          <DataTable minWidth={320 + journal.dates.length * 72} stack={false}>
            <THead>
              <Tr>
                <Th>{t('col.student')}</Th>
                {journal.dates.map((date) => (
                  <Th key={date} className="text-center">
                    {formatShortDate(new Date(`${date}T00:00:00`), lang)}
                  </Th>
                ))}
                <Th className="text-right">{t('col.attendance')}</Th>
              </Tr>
            </THead>
            <TBody>
              {students.map((student) => {
                const records = journal.dates
                  .map((date) => journal.cells.get(`${student.id}:${date}`))
                  .filter((record): record is AttendanceRecord => Boolean(record));
                const rate = percent(records.filter((record) => record.isPresent).length, records.length);
                return (
                  <Tr key={student.id}>
                    <Td className="whitespace-nowrap font-semibold">{student.full_name}</Td>
                    {journal.dates.map((date) => {
                      const record = journal.cells.get(`${student.id}:${date}`);
                      const label = record ? t(record.isPresent ? 'attendance.present' : 'attendance.absent') : '—';
                      return (
                        <Td key={date} className="text-center">
                          <Tooltip title={label}>
                            <span
                              aria-label={label}
                              className={`inline-grid size-7 place-items-center rounded-lg ${
                                record
                                  ? record.isPresent
                                    ? 'bg-success-bg text-success'
                                    : 'bg-danger-bg text-danger'
                                  : 'text-muted'
                              }`}
                            >
                              {record ? (
                                record.isPresent ? (
                                  <Check className="size-4" aria-hidden />
                                ) : (
                                  <X className="size-4" aria-hidden />
                                )
                              ) : (
                                '—'
                              )}
                            </span>
                          </Tooltip>
                        </Td>
                      );
                    })}
                    <Td className="text-right font-bold tabular-nums">{rate === null ? '—' : `${rate}%`}</Td>
                  </Tr>
                );
              })}
            </TBody>
          </DataTable>
        )}
        <StateMessage
          loading={loading}
          error={false}
          empty={journal.dates.length === 0 || students.length === 0}
          emptyText={t('attendance.journalEmpty')}
        />
      </Card>
    </div>
  );
}
