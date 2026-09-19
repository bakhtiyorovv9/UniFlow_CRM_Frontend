'use client';

import { useQuery } from '@tanstack/react-query';
import NextLink from 'next/link';
import { useMemo } from 'react';
import { stripHtml } from '../../components/RichContent';
import { useI18n } from '../../i18n/I18nProvider';
import type { MessageKey } from '../../i18n/messages';
import { formatShortDate, formatTime, percent } from '../../lib/format';
import { fetchAll, keys, useGroups, type Attendance } from '../admin/api';
import type { HomeworkAnswer } from '../admin/group/groupApi';
import {
  Badge,
  Card,
  DataTable,
  PageHeader,
  ProgressBar,
  StateMessage,
  TBody,
  THead,
  Td,
  Th,
  Tr,
  type BadgeTone,
} from '../admin/ui';
import { StudentExams } from './StudentExams';
import { latestAnswers, useMyAnswers } from './studentApi';

const STATUS: Record<HomeworkAnswer['homeworkStatus'], { label: MessageKey; tone: BadgeTone }> = {
  PENDING: { label: 'studentGroup.status.PENDING', tone: 'warning' },
  REJECTED: { label: 'studentGroup.status.REJECTED', tone: 'danger' },
  ACCEPTED: { label: 'studentGroup.status.ACCEPTED', tone: 'success' },
  CHECKED: { label: 'studentGroup.status.CHECKED', tone: 'success' },
};

type AnswerWithHomework = HomeworkAnswer & { homework?: { id: number; title: string; group_id: number | null } };

export function StudentResultsPage() {
  const { t, lang } = useI18n();
  const answers = useMyAnswers();
  const groups = useGroups();
  const attendance = useQuery({
    queryKey: [...keys.attendance, 'mine'],
    queryFn: () => fetchAll<Attendance>('/attendance'),
  });

  const rows = useMemo(
    () =>
      [...latestAnswers(answers.data).values()].sort((a, b) =>
        b.created_at.localeCompare(a.created_at),
      ) as AnswerWithHomework[],
    [answers.data],
  );
  const groupName = useMemo(() => new Map((groups.data ?? []).map((group) => [group.id, group.name])), [groups.data]);

  const records = attendance.data ?? [];
  const attendanceRate = percent(records.filter((record) => record.isPresent).length, records.length);
  const accepted = rows.filter((row) => row.homeworkStatus === 'ACCEPTED' || row.homeworkStatus === 'CHECKED').length;
  const grades = rows.map((row) => row.homeworkResults?.[0]?.grade).filter((grade): grade is number => grade != null);
  const avgGrade = grades.length ? Math.round(grades.reduce((sum, grade) => sum + grade, 0) / grades.length) : null;

  const tiles = [
    {
      label: t('myResults.attendance'),
      value: attendanceRate == null ? '—' : `${attendanceRate}%`,
      bar: attendanceRate,
    },
    { label: t('myResults.submitted'), value: String(rows.length) },
    { label: t('myResults.accepted'), value: String(accepted) },
    { label: t('myResults.avgGrade'), value: avgGrade == null ? '—' : String(avgGrade) },
  ];

  return (
    <div className="space-y-5">
      <PageHeader title={t('nav.myResults')} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {tiles.map((tile) => (
          <Card key={tile.label} className="p-5">
            <p className="text-sm text-muted">{tile.label}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums">
              {answers.isPending || attendance.isPending ? '…' : tile.value}
            </p>
            {tile.bar != null && <ProgressBar value={tile.bar} className="mt-3 w-full" />}
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden">
        <h2 className="border-b border-border px-5 py-3.5 text-sm font-bold">{t('myResults.history')}</h2>
        <DataTable minWidth={720}>
          <THead>
            <Tr>
              <Th>{t('myResults.task')}</Th>
              <Th>{t('myResults.group')}</Th>
              <Th>{t('studentGroup.sentAt')}</Th>
              <Th>{t('myResults.status')}</Th>
              <Th className="text-right">{t('studentGroup.grade')}</Th>
            </Tr>
          </THead>
          <TBody>
            {rows.map((row) => {
              const status = STATUS[row.homeworkStatus];
              const groupId = row.homework?.group_id;
              const result = row.homeworkResults?.[0];
              const sent = new Date(row.created_at);
              return (
                <Tr key={row.id}>
                  <Td>
                    <p className="max-w-80 truncate font-semibold">{stripHtml(row.homework?.title ?? '')}</p>
                  </Td>
                  <Td>
                    {groupId ? (
                      <NextLink href={`/groups/${groupId}`} className="text-fg/85 hover:underline">
                        {groupName.get(groupId) ?? `#${groupId}`}
                      </NextLink>
                    ) : (
                      '—'
                    )}
                  </Td>
                  <Td className="whitespace-nowrap text-fg/85">
                    {formatShortDate(sent, lang, true)}, {formatTime(sent)}
                  </Td>
                  <Td>
                    <Badge tone={status.tone}>{t(status.label)}</Badge>
                  </Td>
                  <Td className="text-right font-bold tabular-nums">
                    {result && row.homeworkStatus !== 'PENDING' ? result.grade : '—'}
                  </Td>
                </Tr>
              );
            })}
          </TBody>
        </DataTable>
        <StateMessage
          loading={answers.isPending}
          error={answers.isError}
          empty={rows.length === 0}
          emptyText={t('myResults.empty')}
          onRetry={() => answers.refetch()}
        />
      </Card>

      <StudentExams showGroup />
    </div>
  );
}
