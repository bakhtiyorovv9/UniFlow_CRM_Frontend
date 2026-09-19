'use client';

import { Pencil, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import NextLink from 'next/link';
import { useState, type FormEvent } from 'react';
import { useI18n } from '../../../i18n/I18nProvider';
import type { MessageKey } from '../../../i18n/messages';
import { formatShortDate, formatTime, localDateInput } from '../../../lib/format';
import {
  Alert,
  Badge,
  Button,
  Card,
  ConfirmDelete,
  DataTable,
  Dialog,
  RowMenu,
  StateMessage,
  TBody,
  THead,
  Td,
  TextField,
  Th,
  Tr,
  apiErrorMessage,
  type BadgeTone,
} from '../ui';
import { examPassed, useDeleteExam, useExams, useGroupDetail, useSaveExam, type Exam } from './groupApi';

export function examWindow(exam: Pick<Exam, 'exam_date' | 'end_date'>, lang: 'uz' | 'ru' | 'en') {
  const start = new Date(exam.exam_date);
  const base = `${formatShortDate(start, lang, true)}, ${formatTime(start)}`;
  if (!exam.end_date) return base;
  const end = new Date(exam.end_date);
  return localDateInput(end) === localDateInput(start)
    ? `${base} – ${formatTime(end)}`
    : `${base} – ${formatShortDate(end, lang, true)}, ${formatTime(end)}`;
}

export function examState(exam: Exam): { label: MessageKey; tone: BadgeTone } {
  const now = new Date();
  if (new Date(exam.exam_date) > now) return { label: 'exam.status.upcoming', tone: 'neutral' };
  if (exam.end_date && new Date(exam.end_date) > now) return { label: 'exam.status.ongoing', tone: 'warning' };
  const graded = exam.results.some((result) => result.score !== null || !result.attended);
  if (!graded) return { label: 'exam.status.ungraded', tone: 'warning' };
  return { label: 'exam.status.graded', tone: 'success' };
}

export function ExamsSection({
  groupId,
  creating,
  onCloseCreate,
  closed,
}: {
  groupId: number;
  creating: boolean;
  onCloseCreate: () => void;
  closed: boolean;
}) {
  const { t, lang } = useI18n();
  const router = useRouter();
  const exams = useExams(groupId);
  const group = useGroupDetail(groupId);
  const remove = useDeleteExam();
  const [editing, setEditing] = useState<Exam | null>(null);
  const [toDelete, setToDelete] = useState<Exam | null>(null);
  const items = exams.data ?? [];
  const totalStudents = group.data?.studentGroups.filter((link) => link.status === 'active').length ?? 0;
  const href = (exam: Exam) => `/groups/${groupId}/exams/${exam.id}`;

  return (
    <Card className="overflow-hidden">
      <DataTable minWidth={860}>
        <THead>
          <Tr>
            <Th className="w-10">#</Th>
            <Th>{t('exam.col')}</Th>
            <Th>{t('exam.date')}</Th>
            <Th className="text-center">{t('exam.scoreCol')}</Th>
            <Th className="text-center">{t('exam.attendedCol')}</Th>
            <Th className="text-center">{t('exam.passedCol')}</Th>
            <Th>{t('exam.statusCol')}</Th>
            <Th className="w-12">
              <span className="sr-only">{t('col.actions')}</span>
            </Th>
          </Tr>
        </THead>
        <TBody>
          {items.map((exam, index) => {
            const state = examState(exam);
            const attended = exam.results.filter((result) => result.attended).length;
            const passed = exam.results.filter((result) => examPassed(exam, result)).length;
            return (
              <Tr key={exam.id} onClick={() => router.push(href(exam))}>
                <Td className="text-muted">{items.length - index}</Td>
                <Td>
                  <NextLink href={href(exam)} className="block max-w-80 truncate font-semibold hover:underline">
                    {exam.title}
                  </NextLink>
                  {exam.description && <p className="max-w-80 truncate text-xs text-muted">{exam.description}</p>}
                </Td>
                <Td className="whitespace-nowrap text-fg/85">{examWindow(exam, lang)}</Td>
                <Td className="text-center whitespace-nowrap tabular-nums">
                  <span className="font-semibold">{exam.pass_score}</span>
                  <span className="text-muted"> / {exam.max_score}</span>
                </Td>
                <Td className="text-center font-semibold tabular-nums">
                  {exam.results.length ? `${attended}/${totalStudents}` : '—'}
                </Td>
                <Td className="text-center font-semibold text-success tabular-nums">
                  {exam.results.length ? passed : '—'}
                </Td>
                <Td>
                  <Badge tone={state.tone}>{t(state.label)}</Badge>
                </Td>
                <Td className="text-right">
                  {!closed && (
                    <RowMenu
                      label={`${t('col.actions')}: ${exam.title}`}
                      items={[
                        { label: t('exam.edit'), icon: Pencil, onSelect: () => setEditing(exam) },
                        {
                          label: t('common.delete'),
                          icon: Trash2,
                          danger: true,
                          onSelect: () => {
                            remove.reset();
                            setToDelete(exam);
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
        loading={exams.isPending}
        error={exams.isError}
        empty={items.length === 0}
        emptyText={t('exam.empty')}
        onRetry={() => exams.refetch()}
      />

      {(creating || editing) && (
        <ExamDialog
          groupId={groupId}
          exam={editing ?? undefined}
          onClose={() => {
            setEditing(null);
            onCloseCreate();
          }}
        />
      )}
      <ConfirmDelete
        open={Boolean(toDelete)}
        name={toDelete?.title ?? ''}
        onClose={() => setToDelete(null)}
        onConfirm={() => toDelete && remove.mutate(toDelete.id, { onSuccess: () => setToDelete(null) })}
        pending={remove.isPending}
        error={remove.error}
      />
    </Card>
  );
}

type Errors = Partial<Record<'title' | 'date' | 'time' | 'endDate' | 'endTime' | 'max' | 'pass', MessageKey>>;

function ExamDialog({ groupId, exam, onClose }: { groupId: number; exam?: Exam; onClose: () => void }) {
  const { t } = useI18n();
  const save = useSaveExam();
  const initial = exam ? new Date(exam.exam_date) : null;
  const [title, setTitle] = useState(exam?.title ?? '');
  const [description, setDescription] = useState(exam?.description ?? '');
  const [date, setDate] = useState(initial ? localDateInput(initial) : localDateInput(new Date()));
  const [time, setTime] = useState(initial ? formatTime(initial) : '10:00');
  const initialEnd = exam?.end_date ? new Date(exam.end_date) : null;
  const [endDate, setEndDate] = useState(initialEnd ? localDateInput(initialEnd) : date);
  const [endTime, setEndTime] = useState(initialEnd ? formatTime(initialEnd) : '12:00');
  const [max, setMax] = useState(String(exam?.max_score ?? 100));
  const [pass, setPass] = useState(String(exam?.pass_score ?? 60));
  const [errors, setErrors] = useState<Errors>({});

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const maxScore = Number(max);
    const passScore = Number(pass);
    const found: Errors = {};
    if (!title.trim()) found.title = 'form.required';
    if (!date) found.date = 'form.required';
    if (!time) found.time = 'form.required';
    if (!endDate) found.endDate = 'form.required';
    if (!endTime) found.endTime = 'form.required';
    if (date && time && endDate && endTime && new Date(`${endDate}T${endTime}`) <= new Date(`${date}T${time}`))
      found.endTime = 'exam.endBeforeStart';
    if (!Number.isInteger(maxScore) || maxScore < 1 || maxScore > 1000) found.max = 'form.required';
    if (!Number.isInteger(passScore) || passScore < 0) found.pass = 'form.required';
    else if (!found.max && passScore > maxScore) found.pass = 'exam.passTooHigh';
    if (!exam && date && date < localDateInput(new Date())) found.date = 'exam.pastDate';
    setErrors(found);
    if (Object.keys(found).length) return;
    save.mutate(
      {
        id: exam?.id,
        groupId,
        input: {
          title: title.trim(),
          description: description.trim(),
          exam_date: new Date(`${date}T${time}`).toISOString(),
          end_date: new Date(`${endDate}T${endTime}`).toISOString(),
          max_score: maxScore,
          pass_score: passScore,
        },
      },
      { onSuccess: onClose },
    );
  }

  const clear = (key: keyof Errors) => setErrors((current) => ({ ...current, [key]: undefined }));

  return (
    <Dialog
      open
      onClose={onClose}
      title={t(exam ? 'exam.edit' : 'exam.create')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" form="exam-form" loading={save.isPending}>
            {t('common.save')}
          </Button>
        </>
      }
    >
      <form id="exam-form" className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit} noValidate>
        {save.error ? (
          <div className="sm:col-span-2">
            <Alert>{apiErrorMessage(save.error, t('error.unknown'))}</Alert>
          </div>
        ) : null}
        <div className="sm:col-span-2">
          <TextField
            label={t('exam.title')}
            placeholder={t('exam.titlePlaceholder')}
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
              clear('title');
            }}
            error={errors.title}
            autoFocus
          />
        </div>
        <div className="sm:col-span-2">
          <TextField
            label={t('exam.description')}
            optional
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>
        <TextField
          label={t('exam.startDate')}
          type="date"
          value={date}
          onChange={(event) => {
            setDate(event.target.value);
            if (!endDate || endDate < event.target.value) setEndDate(event.target.value);
            clear('date');
          }}
          error={errors.date}
        />
        <TextField
          label={t('exam.startTime')}
          type="time"
          value={time}
          onChange={(event) => {
            setTime(event.target.value);
            clear('time');
            clear('endTime');
          }}
          error={errors.time}
        />
        <TextField
          label={t('exam.endDate')}
          type="date"
          value={endDate}
          min={date}
          onChange={(event) => {
            setEndDate(event.target.value);
            clear('endDate');
            clear('endTime');
          }}
          error={errors.endDate}
        />
        <TextField
          label={t('exam.endTime')}
          type="time"
          value={endTime}
          onChange={(event) => {
            setEndTime(event.target.value);
            clear('endTime');
          }}
          error={errors.endTime}
        />
        <TextField
          label={t('exam.maxScore')}
          type="number"
          min={1}
          max={1000}
          value={max}
          onChange={(event) => {
            setMax(event.target.value);
            clear('max');
            clear('pass');
          }}
          error={errors.max}
        />
        <TextField
          label={t('exam.passScore')}
          type="number"
          min={0}
          value={pass}
          onChange={(event) => {
            setPass(event.target.value);
            clear('pass');
          }}
          error={errors.pass}
        />
      </form>
    </Dialog>
  );
}
