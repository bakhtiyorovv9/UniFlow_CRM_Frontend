'use client';

import { useMemo } from 'react';
import { useI18n } from '../../../i18n/I18nProvider';
import { percent } from '../../../lib/format';
import type { Lesson } from '../api';
import { Avatar, DataTable, Dialog, ProgressBar, StateMessage, TBody, THead, Td, Th, Tr } from '../ui';
import { useGroupAnswers, useGroupHomeworks, type AttendanceRecord, type GroupDetail } from './groupApi';

export function GroupStatsDialog({
  group,
  lessons,
  attendance,
  onClose,
}: {
  group: GroupDetail;
  lessons: Lesson[];
  attendance: AttendanceRecord[];
  onClose: () => void;
}) {
  const { t } = useI18n();
  const homeworks = useGroupHomeworks(group.id);
  const answers = useGroupAnswers(group.id);

  const stats = useMemo(() => {
    const students = group.studentGroups
      .filter((link) => link.status === 'active')
      .map((link) => link.students)
      .sort((a, b) => a.full_name.localeCompare(b.full_name));
    const homeworkIds = new Set((homeworks.data ?? []).map((homework) => homework.id));
    const groupAnswers = (answers.data ?? []).filter((answer) => homeworkIds.has(answer.homework_id));

    const perStudent = students.map((student) => {
      const records = attendance.filter((record) => record.student_id === student.id);
      const present = records.filter((record) => record.isPresent).length;
      const submitted = new Set(
        groupAnswers.filter((answer) => answer.student_id === student.id).map((answer) => answer.homework_id),
      ).size;
      return { student, attendance: percent(present, records.length), recorded: records.length, submitted };
    });

    const presentTotal = attendance.filter((record) => record.isPresent).length;
    return {
      students,
      perStudent,
      attendance: percent(presentTotal, attendance.length),
      submissions: groupAnswers.length,
      pending: groupAnswers.filter((answer) => answer.homeworkStatus === 'PENDING').length,
    };
  }, [group, attendance, homeworks.data, answers.data]);

  const loading = homeworks.isPending || answers.isPending;
  const totalHomeworks = homeworks.data?.length ?? 0;
  const tiles = [
    { label: t('stats.students'), value: String(stats.students.length) },
    { label: t('stats.lessons'), value: String(lessons.length) },
    { label: t('stats.attendance'), value: attendance.length ? `${stats.attendance}%` : '—' },
    { label: t('stats.homeworks'), value: loading ? '…' : String(totalHomeworks) },
    { label: t('stats.submissions'), value: loading ? '…' : String(stats.submissions) },
    { label: t('stats.pendingReview'), value: loading ? '…' : String(stats.pending) },
  ];

  return (
    <Dialog open onClose={onClose} title={`${t('stats.title')}: ${group.name}`}>
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {tiles.map((tile) => (
            <div key={tile.label} className="rounded-xl border border-border px-4 py-3">
              <p className="text-xs text-muted">{tile.label}</p>
              <p className="mt-1 text-xl font-bold tabular-nums">{tile.value}</p>
            </div>
          ))}
        </div>

        <div>
          <h3 className="mb-2 text-sm font-bold">{t('stats.byStudent')}</h3>
          <div className="overflow-hidden rounded-xl border border-border">
            <DataTable minWidth={420}>
              <THead>
                <Tr>
                  <Th>{t('stats.student')}</Th>
                  <Th className="w-40">{t('stats.attendanceCol')}</Th>
                  <Th className="text-right">{t('stats.homeworkCol')}</Th>
                </Tr>
              </THead>
              <TBody>
                {stats.perStudent.map((row) => (
                  <Tr key={row.student.id}>
                    <Td>
                      <div className="flex items-center gap-2">
                        <Avatar name={row.student.full_name} tone="neutral" photo={row.student.photo} />
                        <span className="font-semibold">{row.student.full_name}</span>
                      </div>
                    </Td>
                    <Td>
                      {row.recorded ? (
                        <div className="flex items-center gap-2">
                          <ProgressBar value={row.attendance} />
                          <span className="w-10 text-right text-xs font-semibold tabular-nums">{row.attendance}%</span>
                        </div>
                      ) : (
                        '—'
                      )}
                    </Td>
                    <Td className="text-right font-semibold tabular-nums">
                      {loading ? '…' : `${row.submitted}/${totalHomeworks}`}
                    </Td>
                  </Tr>
                ))}
              </TBody>
            </DataTable>
            <StateMessage
              loading={false}
              error={false}
              empty={stats.perStudent.length === 0}
              emptyText={t('groupStudents.empty')}
            />
          </div>
        </div>
      </div>
    </Dialog>
  );
}
