'use client';

import FormHelperText from '@mui/material/FormHelperText';
import FormLabel from '@mui/material/FormLabel';
import MuiIconButton from '@mui/material/IconButton';
import MuiTextField from '@mui/material/TextField';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Tooltip from '@mui/material/Tooltip';
import { ChevronLeft, Eye, Minus, Paperclip, Plus } from 'lucide-react';
import NextLink from 'next/link';
import { useMemo, useState, type FormEvent } from 'react';
import { RichContent, stripHtml } from '../../components/RichContent';
import { useI18n } from '../../i18n/I18nProvider';
import type { MessageKey } from '../../i18n/messages';
import { photoUrl } from '../../lib/api';
import { formatShortDate, formatTime } from '../../lib/format';
import { homeworkDeadline } from '../../lib/schedule';
import {
  useAnswersForHomework,
  useGroupDetail,
  useHomework,
  useReviewAnswer,
  type HomeworkAnswer,
} from '../admin/group/groupApi';
import {
  Alert,
  Avatar,
  Badge,
  Button,
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
import { useUrlState } from '../admin/useUrlState';

type Bucket = 'pending' | 'returned' | 'accepted' | 'notDone';

const BUCKETS: { value: Bucket; label: MessageKey; color: string }[] = [
  { value: 'pending', label: 'hwResults.pending', color: 'bg-warning' },
  { value: 'returned', label: 'hwResults.returned', color: 'bg-danger' },
  { value: 'accepted', label: 'hwResults.accepted', color: 'bg-success' },
  { value: 'notDone', label: 'hwResults.notDone', color: 'bg-muted' },
];

type Row = { student: { id: number; full_name: string; photo?: string | null }; answer?: HomeworkAnswer };

function bucketOf(answer: HomeworkAnswer): Bucket {
  if (answer.homeworkStatus === 'PENDING') return 'pending';
  if (answer.homeworkStatus === 'REJECTED') return 'returned';
  return 'accepted';
}

function gradeTone(grade: number): BadgeTone {
  if (grade >= 80) return 'success';
  if (grade >= 50) return 'warning';
  return 'danger';
}

export function HomeworkResultsPage({ groupId, homeworkId }: { groupId: number; homeworkId: number }) {
  const { t, lang } = useI18n();
  const homework = useHomework(homeworkId);
  const group = useGroupDetail(groupId);
  const answers = useAnswersForHomework(homeworkId);
  const [bucket, setBucket] = useUrlState<Bucket>('status', 'pending');
  const [viewingTask, setViewingTask] = useState(false);
  const [reviewing, setReviewing] = useState<Row | null>(null);

  const backHref = `/groups/${groupId}?tab=materials&section=homework`;
  const dateTime = (value: Date | string) => {
    const date = new Date(value);
    return `${formatShortDate(date, lang, true)}, ${formatTime(date)}`;
  };

  const rows = useMemo(() => {
    const result: Record<Bucket, Row[]> = { pending: [], returned: [], accepted: [], notDone: [] };
    const latest = new Map<number, HomeworkAnswer>();
    answers.data?.forEach((answer) => {
      if (!latest.has(answer.student_id)) latest.set(answer.student_id, answer);
    });
    latest.forEach((answer) => {
      const student = answer.students ?? { id: answer.student_id, full_name: `#${answer.student_id}` };
      result[bucketOf(answer)].push({ student, answer });
    });
    group.data?.studentGroups
      .filter((link) => link.status === 'active' && !latest.has(link.students.id))
      .forEach((link) => result.notDone.push({ student: link.students }));
    result.notDone.sort((a, b) => a.student.full_name.localeCompare(b.student.full_name));
    return result;
  }, [answers.data, group.data]);

  const back = (
    <Tooltip title={t('group.back')}>
      <MuiIconButton component={NextLink} href={backHref} aria-label={t('group.back')}>
        <ChevronLeft className="size-5" aria-hidden />
      </MuiIconButton>
    </Tooltip>
  );

  if (!homework.data || !group.data) {
    const failed = homework.isError || group.isError;
    return (
      <div className="space-y-4">
        {back}
        <StateMessage
          loading={!failed}
          error={failed}
          empty={false}
          onRetry={() => {
            homework.refetch();
            group.refetch();
          }}
        />
        {failed && <p className="text-center text-sm text-muted">{t('hwResults.notFound')}</p>}
      </div>
    );
  }

  if (homework.data.group_id !== groupId) {
    return (
      <div className="space-y-4">
        {back}
        <p className="text-center text-sm text-muted">{t('hwResults.notFound')}</p>
      </div>
    );
  }

  const task = homework.data;
  const title = stripHtml(task.title);
  const deadline = homeworkDeadline(task.created_at);
  const visible = rows[bucket];

  return (
    <div className="space-y-5">
      <div className="flex min-w-0 items-center gap-2">
        {back}
        <h1 className="truncate text-2xl font-bold tracking-tight">{task.lesson?.topic ?? title}</h1>
      </div>

      <div className="flex flex-wrap items-center gap-x-12 gap-y-4 rounded-2xl border border-border bg-surface px-5 py-4">
        <div className="min-w-0">
          <p className="text-xs text-muted">{t('hwResults.topic')}</p>
          <p className="max-w-80 truncate text-sm font-bold">{task.lesson?.topic ?? '—'}</p>
        </div>
        <div>
          <p className="text-xs text-muted">{t('hwResults.given')}</p>
          <p className="text-sm font-bold">{dateTime(task.created_at)}</p>
        </div>
        <div>
          <p className="text-xs text-muted">{t('hwResults.deadline')}</p>
          <Tooltip title={t('hwResults.deadlineHint')}>
            <p className="text-sm font-bold">{dateTime(deadline)}</p>
          </Tooltip>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {task.file && (
            <Button
              variant="ghost"
              icon={Paperclip}
              onClick={() => window.open(photoUrl(task.file ?? ''), '_blank', 'noopener')}
            >
              {task.file.split('/').pop()}
            </Button>
          )}
          <Button variant="secondary" icon={Eye} onClick={() => setViewingTask(true)}>
            {t('hwResults.viewTask')}
          </Button>
        </div>
      </div>

      <Tabs value={bucket} onChange={(_, value: Bucket) => setBucket(value)} variant="scrollable" scrollButtons={false}>
        {BUCKETS.map((item) => (
          <Tab
            key={item.value}
            value={item.value}
            label={
              <span className="inline-flex items-center gap-2">
                {t(item.label)}
                <span
                  className={`inline-flex min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] leading-5 font-bold text-white tabular-nums ${item.color}`}
                >
                  {answers.isPending ? '·' : rows[item.value].length}
                </span>
              </span>
            }
          />
        ))}
      </Tabs>

      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        <DataTable minWidth={560}>
          <THead>
            <Tr>
              <Th className="w-10">#</Th>
              <Th>{t('hwResults.student')}</Th>
              {bucket !== 'notDone' && <Th>{t('hwResults.sentAt')}</Th>}
              {(bucket === 'accepted' || bucket === 'returned') && <Th>{t('hwResults.grade')}</Th>}
              {bucket !== 'notDone' && (
                <Th className="w-32">
                  <span className="sr-only">{t('col.actions')}</span>
                </Th>
              )}
            </Tr>
          </THead>
          <TBody>
            {visible.map((row, index) => {
              const result = row.answer?.homeworkResults?.[0];
              return (
                <Tr key={row.student.id} onClick={row.answer ? () => setReviewing(row) : undefined}>
                  <Td className="text-muted">{index + 1}</Td>
                  <Td>
                    <div className="flex items-center gap-2.5">
                      <Avatar name={row.student.full_name} tone="neutral" photo={row.student.photo} />
                      <span className="font-semibold">{row.student.full_name}</span>
                    </div>
                  </Td>
                  {row.answer && (
                    <Td className="whitespace-nowrap text-fg/85">
                      {dateTime(row.answer.created_at)}
                      {new Date(row.answer.created_at) > deadline && (
                        <span className="ml-2 rounded-md bg-danger-bg px-1.5 py-0.5 text-[11px] font-bold text-danger">
                          {t('hwResults.late')}
                        </span>
                      )}
                    </Td>
                  )}
                  {row.answer && (bucket === 'accepted' || bucket === 'returned') && (
                    <Td>{result ? <Badge tone={gradeTone(result.grade)}>{result.grade}</Badge> : '—'}</Td>
                  )}
                  {row.answer && (
                    <Td className="text-right">
                      <Button
                        variant={bucket === 'pending' ? 'primary' : 'secondary'}
                        onClick={() => setReviewing(row)}
                      >
                        {bucket === 'pending' ? t('hwResults.check') : t('homework.view')}
                      </Button>
                    </Td>
                  )}
                </Tr>
              );
            })}
          </TBody>
        </DataTable>
        <StateMessage
          loading={answers.isPending}
          error={answers.isError}
          empty={visible.length === 0}
          emptyText={t('hwResults.empty')}
          onRetry={() => answers.refetch()}
        />
      </div>

      {viewingTask && (
        <Dialog open onClose={() => setViewingTask(false)} title={task.lesson?.topic ?? t('materials.homework')}>
          <RichContent html={task.title} />
        </Dialog>
      )}
      {reviewing?.answer && (
        <ReviewDialog
          key={reviewing.answer.id}
          student={reviewing.student.full_name}
          answer={reviewing.answer}
          sentAt={dateTime(reviewing.answer.created_at)}
          onClose={() => setReviewing(null)}
        />
      )}
    </div>
  );
}

function ReviewDialog({
  student,
  answer,
  sentAt,
  onClose,
}: {
  student: string;
  answer: HomeworkAnswer;
  sentAt: string;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const review = useReviewAnswer();
  const previous = answer.homeworkResults?.[0];
  const [grade, setGrade] = useState(previous ? String(previous.grade) : '');
  const [comment, setComment] = useState(previous?.title ?? '');
  const [errors, setErrors] = useState<{ grade?: MessageKey; comment?: MessageKey }>({});
  const [decision, setDecision] = useState<'ACCEPTED' | 'REJECTED'>('ACCEPTED');

  function submit(status: 'ACCEPTED' | 'REJECTED') {
    setDecision(status);
    const value = grade.trim() === '' && status === 'REJECTED' ? 0 : Number(grade);
    const found = {
      grade:
        grade.trim() === '' && status === 'ACCEPTED'
          ? ('form.required' as const)
          : Number.isInteger(value) && value >= 0 && value <= 100
            ? undefined
            : ('review.gradeInvalid' as const),
      comment: comment.trim() ? undefined : ('form.required' as const),
    };
    setErrors(found);
    if (found.grade || found.comment) return;
    review.mutate(
      { homework_answer_id: answer.id, grade: value, title: comment.trim(), homeworkStatus: status },
      { onSuccess: onClose },
    );
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={t('review.title')}
      footer={
        <>
          <Button
            variant="danger"
            loading={review.isPending && decision === 'REJECTED'}
            disabled={review.isPending}
            onClick={() => submit('REJECTED')}
          >
            {t('review.return')}
          </Button>
          <Button
            loading={review.isPending && decision === 'ACCEPTED'}
            disabled={review.isPending}
            onClick={() => submit('ACCEPTED')}
          >
            {t('review.accept')}
          </Button>
        </>
      }
    >
      <form
        className="space-y-4"
        noValidate
        onSubmit={(event: FormEvent) => {
          event.preventDefault();
          submit('ACCEPTED');
        }}
      >
        {review.error ? <Alert>{apiErrorMessage(review.error, t('error.unknown'))}</Alert> : null}
        <div>
          <p className="font-bold">{student}</p>
          <p className="text-xs text-muted">
            {t('hwResults.sentAt')}: {sentAt}
          </p>
        </div>

        <div className="rounded-xl border border-border p-4">
          <p className="mb-2 text-xs font-semibold text-muted">{t('review.answer')}</p>
          {answer.title.trim() ? (
            <RichContent html={answer.title} />
          ) : (
            <p className="text-sm text-muted">{t('review.noText')}</p>
          )}
          {answer.file && (
            <a
              href={photoUrl(answer.file)}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:underline"
            >
              <Paperclip className="size-4" aria-hidden />
              {t('review.attachment')}: {answer.file.split('/').pop()}
            </a>
          )}
        </div>

        {previous && (
          <p className="text-xs text-muted">
            {t('review.previous')}: <span className="font-bold text-fg">{previous.grade}</span>
          </p>
        )}

        <GradePicker
          value={grade}
          onChange={(next) => {
            setGrade(next);
            setErrors((current) => ({ ...current, grade: undefined }));
          }}
          error={errors.grade}
        />
        <div>
          <FormLabel htmlFor="review-comment" className="mb-1.5 block">
            {t('review.comment')}
          </FormLabel>
          <MuiTextField
            id="review-comment"
            fullWidth
            multiline
            minRows={3}
            size="small"
            placeholder={t('review.commentPlaceholder')}
            value={comment}
            onChange={(event) => {
              setComment(event.target.value);
              setErrors((current) => ({ ...current, comment: undefined }));
            }}
            error={Boolean(errors.comment)}
            helperText={errors.comment ? t(errors.comment) : undefined}
          />
        </div>
      </form>
    </Dialog>
  );
}

const GRADE_PRESETS = [100, 95, 90, 80, 70, 60];

const GRADE_COLORS: Record<BadgeTone, { ring: string; text: string; bg: string }> = {
  success: { ring: 'border-success', text: 'text-success', bg: 'bg-success-bg' },
  warning: { ring: 'border-warning', text: 'text-warning', bg: 'bg-warning-bg' },
  danger: { ring: 'border-danger', text: 'text-danger', bg: 'bg-danger-bg' },
  neutral: { ring: 'border-border', text: 'text-muted', bg: 'bg-surface' },
};

function GradePicker({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (value: string) => void;
  error?: MessageKey;
}) {
  const { t } = useI18n();
  const numeric = value.trim() === '' ? null : Number(value);
  const valid = numeric !== null && Number.isInteger(numeric) && numeric >= 0 && numeric <= 100;
  const tone: BadgeTone = valid ? gradeTone(numeric) : 'neutral';
  const colors = GRADE_COLORS[tone];
  const step = (delta: number) => onChange(String(Math.min(100, Math.max(0, (valid ? numeric : 0) + delta))));

  return (
    <div>
      <FormLabel id="grade-label" className="mb-2 block">
        {t('review.grade')}
      </FormLabel>
      <div className="flex flex-wrap items-center gap-4 sm:flex-nowrap">
        <div
          className={`grid size-20 shrink-0 place-items-center rounded-full border-4 transition-colors ${colors.ring} ${colors.bg}`}
          aria-hidden
        >
          <span className={`text-2xl font-extrabold tabular-nums ${colors.text}`}>{valid ? numeric : '—'}</span>
        </div>
        <div className="min-w-0 flex-1 space-y-2.5">
          <div role="group" aria-labelledby="grade-label" className="grid grid-cols-6 gap-1.5">
            {GRADE_PRESETS.map((preset) => {
              const selected = valid && numeric === preset;
              const presetColors = GRADE_COLORS[gradeTone(preset)];
              return (
                <button
                  key={preset}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onChange(String(preset))}
                  className={`h-9 cursor-pointer rounded-lg border text-sm font-bold tabular-nums transition-all focus-visible:outline-2 focus-visible:outline-primary ${
                    selected
                      ? `${presetColors.ring} ${presetColors.bg} ${presetColors.text} scale-105`
                      : 'border-border hover:border-primary/60 hover:bg-surface-hover'
                  }`}
                >
                  {preset}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-1.5">
            <MuiIconButton
              size="small"
              onClick={() => step(-1)}
              aria-label="-1"
              sx={{ border: 1, borderColor: 'divider', borderRadius: 2 }}
            >
              <Minus className="size-4" aria-hidden />
            </MuiIconButton>
            <MuiTextField
              size="small"
              type="number"
              value={value}
              placeholder={t('review.gradeManual')}
              onChange={(event) => onChange(event.target.value.replace(/[^\d]/g, '').slice(0, 3))}
              error={Boolean(error)}
              slotProps={{
                htmlInput: {
                  min: 0,
                  max: 100,
                  inputMode: 'numeric',
                  'aria-labelledby': 'grade-label',
                  className: 'text-center',
                },
              }}
              sx={{ flex: 1 }}
            />
            <MuiIconButton
              size="small"
              onClick={() => step(1)}
              aria-label="+1"
              sx={{ border: 1, borderColor: 'divider', borderRadius: 2 }}
            >
              <Plus className="size-4" aria-hidden />
            </MuiIconButton>
          </div>
        </div>
      </div>
      {error && <FormHelperText error>{t(error)}</FormHelperText>}
    </div>
  );
}
