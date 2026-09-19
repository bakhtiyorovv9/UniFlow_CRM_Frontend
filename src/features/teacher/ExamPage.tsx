'use client';

import MuiAlert from '@mui/material/Alert';
import MuiIconButton from '@mui/material/IconButton';
import MuiTextField from '@mui/material/TextField';
import Switch from '@mui/material/Switch';
import Tooltip from '@mui/material/Tooltip';
import { CheckCheck, ChevronLeft, Eye } from 'lucide-react';
import NextLink from 'next/link';
import { useMemo, useState } from 'react';
import { useI18n } from '../../i18n/I18nProvider';
import type { MessageKey } from '../../i18n/messages';
import { examState, examWindow } from '../admin/group/ExamsSection';
import { AnswerView } from '../student/StudentExams';
import { examPassed, useExam, useGroupDetail, useSaveExamResults, type ExamResult } from '../admin/group/groupApi';
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  DataTable,
  Dialog,
  StateMessage,
  TBody,
  THead,
  Td,
  Th,
  Tr,
  apiErrorMessage,
  type BadgeTone,
} from '../admin/ui';

type Draft = { attended: boolean; score: string; comment: string };

function resultBadge(passScore: number, draft: Draft | undefined): { label: MessageKey; tone: BadgeTone } {
  if (!draft) return { label: 'exam.pending', tone: 'neutral' };
  if (!draft.attended) return { label: 'exam.absent', tone: 'danger' };
  if (draft.score.trim() === '') return { label: 'exam.pending', tone: 'neutral' };
  return Number(draft.score) >= passScore
    ? { label: 'exam.passed', tone: 'success' }
    : { label: 'exam.failed', tone: 'warning' };
}

export function ExamPage({ groupId, examId }: { groupId: number; examId: number }) {
  const { t, lang } = useI18n();
  const exam = useExam(examId);
  const group = useGroupDetail(groupId);
  const save = useSaveExamResults(examId);
  const [drafts, setDrafts] = useState<Record<number, Draft>>({});
  const [scoreError, setScoreError] = useState<string | null>(null);
  const [viewing, setViewing] = useState<number | null>(null);

  const saved = useMemo(() => {
    const map = new Map<number, ExamResult>();
    exam.data?.results.forEach((result) => map.set(result.student_id, result));
    return map;
  }, [exam.data]);

  const backHref = `/groups/${groupId}?tab=materials&section=exams`;
  const back = (
    <Tooltip title={t('group.back')}>
      <MuiIconButton component={NextLink} href={backHref} aria-label={t('group.back')}>
        <ChevronLeft className="size-5" aria-hidden />
      </MuiIconButton>
    </Tooltip>
  );

  if (!exam.data || !group.data) {
    const failed = exam.isError || group.isError;
    return (
      <div className="space-y-4">
        {back}
        <StateMessage loading={!failed} error={failed} empty={false} onRetry={() => exam.refetch()} />
        {failed && <p className="text-center text-sm text-muted">{t('exam.notFound')}</p>}
      </div>
    );
  }
  if (exam.data.group_id !== groupId) {
    return (
      <div className="space-y-4">
        {back}
        <p className="text-center text-sm text-muted">{t('exam.notFound')}</p>
      </div>
    );
  }

  const data = exam.data;
  const date = new Date(data.exam_date);
  const started = date <= new Date();
  const closed = group.data.status === 'completed' || group.data.status === 'inactive';
  const canEdit = started && !closed;
  const state = examState(data);
  const students = group.data.studentGroups
    .filter((link) => link.status === 'active')
    .map((link) => link.students)
    .sort((a, b) => a.full_name.localeCompare(b.full_name));

  const draftFor = (studentId: number): Draft | undefined => {
    if (drafts[studentId]) return drafts[studentId];
    const result = saved.get(studentId);
    if (!result) return canEdit ? { attended: true, score: '', comment: '' } : undefined;
    return {
      attended: result.attended,
      score: result.score === null ? '' : String(result.score),
      comment: result.comment ?? '',
    };
  };
  const update = (studentId: number, patch: Partial<Draft>) => {
    setScoreError(null);
    setDrafts((current) => {
      const base = current[studentId] ?? draftFor(studentId) ?? { attended: true, score: '', comment: '' };
      return { ...current, [studentId]: { ...base, ...patch } };
    });
  };

  const results = data.results;
  const attended = results.filter((result) => result.attended);
  const passed = results.filter((result) => examPassed(data, result)).length;
  const scores = attended.map((result) => result.score ?? 0);
  const avg = scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : null;
  const passRate = attended.length ? Math.round((passed / attended.length) * 100) : null;

  function handleSave() {
    const payload = students.map((student) => {
      const draft = draftFor(student.id) ?? { attended: true, score: '', comment: '' };
      return { student, draft };
    });
    const invalid = payload.find(({ draft }) => {
      if (!draft.attended) return false;
      const value = Number(draft.score);
      return draft.score.trim() === '' || !Number.isInteger(value) || value < 0 || value > data.max_score;
    });
    if (invalid) {
      const reason =
        invalid.draft.score.trim() === ''
          ? t('exam.scoreRequired')
          : t('exam.scoreRange', { max: String(data.max_score) });
      setScoreError(`${invalid.student.full_name}: ${reason}`);
      return;
    }
    save.mutate(
      payload.map(({ student, draft }) => ({
        student_id: student.id,
        attended: draft.attended,
        ...(draft.attended && { score: Number(draft.score) }),
        ...(draft.comment.trim() && { comment: draft.comment.trim() }),
      })),
      { onSuccess: () => setDrafts({}) },
    );
  }

  const tiles = [
    { label: t('exam.window'), value: examWindow(data, lang) },
    { label: t('exam.passScore'), value: `${data.pass_score} / ${data.max_score}` },
    { label: t('exam.attendedCol'), value: results.length ? `${attended.length} / ${students.length}` : '—' },
    { label: t('exam.passedCol'), value: results.length ? String(passed) : '—' },
    { label: t('exam.avg'), value: avg === null ? '—' : String(avg) },
    { label: t('exam.passRate'), value: passRate === null ? '—' : `${passRate}%` },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          {back}
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-bold tracking-tight">{data.title}</h1>
            <p className="truncate text-sm text-muted">
              {group.data.name}
              {data.description ? ` · ${data.description}` : ''}
            </p>
          </div>
          <Badge tone={state.tone}>{t(state.label)}</Badge>
        </div>
      </div>

      <Card className="p-5">
        <h2 className="text-sm font-bold">{t('exam.info')}</h2>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
          {tiles.map((tile) => (
            <div key={tile.label} className="min-w-0 first:col-span-2 sm:first:col-span-1">
              <p className="text-xs text-muted">{tile.label}</p>
              <p className="text-sm font-bold tabular-nums sm:truncate">{tile.value}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card className="overflow-hidden">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
          <h2 className="text-base font-bold">{t('exam.result')}</h2>
          {canEdit && (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                icon={CheckCheck}
                disabled={students.length === 0}
                onClick={() => students.forEach((student) => update(student.id, { attended: true }))}
              >
                {t('exam.allCame')}
              </Button>
              <Button loading={save.isPending} disabled={students.length === 0} onClick={handleSave}>
                {t('exam.save')}
              </Button>
            </div>
          )}
        </header>

        <div className="space-y-3 px-5 pt-4 empty:hidden">
          {closed && (
            <MuiAlert severity="warning" variant="outlined" sx={{ borderRadius: 2 }}>
              {t('group.closedNotice')}
            </MuiAlert>
          )}
          {!started && !closed && (
            <MuiAlert severity="info" variant="outlined" sx={{ borderRadius: 2 }}>
              {t('exam.notStarted')}
            </MuiAlert>
          )}
          {scoreError && <Alert>{scoreError}</Alert>}
          {save.error ? <Alert>{apiErrorMessage(save.error, t('error.unknown'))}</Alert> : null}
        </div>

        <DataTable minWidth={960}>
          <THead>
            <Tr>
              <Th className="w-10">#</Th>
              <Th>{t('exam.student')}</Th>
              <Th className="w-24 text-center">{t('exam.came')}</Th>
              <Th className="w-36">{t('exam.scoreCol')}</Th>
              <Th className="w-32">{t('exam.result')}</Th>
              <Th className="w-36">{t('exam.answerCol')}</Th>
              <Th>{t('exam.comment')}</Th>
            </Tr>
          </THead>
          <TBody>
            {students.map((student, index) => {
              const draft = draftFor(student.id);
              const badge = resultBadge(data.pass_score, draft);
              return (
                <Tr key={student.id}>
                  <Td className="text-muted">{index + 1}</Td>
                  <Td>
                    <div className="flex items-center gap-2.5">
                      <Avatar name={student.full_name} tone="neutral" photo={student.photo} />
                      <span className="font-semibold">{student.full_name}</span>
                    </div>
                  </Td>
                  <Td className="text-center">
                    <Switch
                      color="success"
                      checked={draft?.attended ?? false}
                      disabled={!canEdit}
                      onChange={(event) =>
                        update(student.id, {
                          attended: event.target.checked,
                          ...(!event.target.checked && { score: '' }),
                        })
                      }
                      slotProps={{ input: { 'aria-label': `${student.full_name}: ${t('exam.came')}` } }}
                    />
                  </Td>
                  <Td>
                    <MuiTextField
                      size="small"
                      type="number"
                      value={draft?.score ?? ''}
                      disabled={!canEdit || !draft?.attended}
                      placeholder={`0–${data.max_score}`}
                      onChange={(event) =>
                        update(student.id, { score: event.target.value.replace(/[^\d]/g, '').slice(0, 4) })
                      }
                      error={
                        Boolean(draft?.attended && draft.score !== '') &&
                        (Number(draft?.score) > data.max_score || Number(draft?.score) < 0)
                      }
                      slotProps={{
                        htmlInput: {
                          min: 0,
                          max: data.max_score,
                          inputMode: 'numeric',
                          'aria-label': `${student.full_name}: ${t('exam.scoreCol')}`,
                        },
                      }}
                      sx={{ width: 110 }}
                    />
                  </Td>
                  <Td>
                    <Badge tone={badge.tone}>{t(badge.label)}</Badge>
                  </Td>
                  <Td>
                    {saved.get(student.id)?.submitted_at ? (
                      <Button variant="ghost" icon={Eye} onClick={() => setViewing(student.id)}>
                        {t('exam.viewAnswer')}
                      </Button>
                    ) : (
                      <span className="text-xs text-muted">{t('exam.noAnswer')}</span>
                    )}
                  </Td>
                  <Td>
                    <MuiTextField
                      size="small"
                      fullWidth
                      value={draft?.comment ?? ''}
                      disabled={!canEdit}
                      onChange={(event) => update(student.id, { comment: event.target.value })}
                      slotProps={{
                        htmlInput: { maxLength: 500, 'aria-label': `${student.full_name}: ${t('exam.comment')}` },
                      }}
                    />
                  </Td>
                </Tr>
              );
            })}
          </TBody>
        </DataTable>
        <StateMessage
          loading={false}
          error={false}
          empty={students.length === 0}
          emptyText={t('groupStudents.empty')}
        />
      </Card>

      {viewing !== null && saved.get(viewing) && (
        <Dialog
          open
          onClose={() => setViewing(null)}
          title={`${t('exam.answer')}: ${saved.get(viewing)?.students?.full_name ?? ''}`}
        >
          <AnswerView exam={{ results: [saved.get(viewing)!] }} />
        </Dialog>
      )}
    </div>
  );
}
