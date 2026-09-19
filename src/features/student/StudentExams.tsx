'use client';

import FormHelperText from '@mui/material/FormHelperText';
import FormLabel from '@mui/material/FormLabel';
import { Eye, GraduationCap, Paperclip, Send } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { FileDropzone, type UploadedFile } from '../../components/FileDropzone';
import { RichContent } from '../../components/RichContent';
import { RichTextEditor } from '../../components/RichTextEditor';
import { useI18n } from '../../i18n/I18nProvider';
import type { MessageKey } from '../../i18n/messages';
import { photoUrl } from '../../lib/api';
import { formatShortDate, formatTime } from '../../lib/format';
import { examWindow } from '../admin/group/ExamsSection';
import { useExams, useSubmitExamAnswer, type Exam } from '../admin/group/groupApi';
import {
  Alert,
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

export function myExamStatus(exam: Exam): { label: MessageKey; tone: BadgeTone } {
  const result = exam.results[0];
  if (!result) {
    const now = new Date();
    if (new Date(exam.exam_date) > now) return { label: 'exam.status.upcoming', tone: 'neutral' };
    if (exam.end_date && new Date(exam.end_date) > now) return { label: 'exam.status.ongoing', tone: 'warning' };
    return { label: 'studentGroup.status.NONE', tone: 'neutral' };
  }
  if (!result.attended) return { label: 'exam.absent', tone: 'danger' };
  if (result.score === null) return { label: 'exam.submitted', tone: 'warning' };
  return result.score >= exam.pass_score
    ? { label: 'exam.passed', tone: 'success' }
    : { label: 'exam.failed', tone: 'warning' };
}

function canSubmit(exam: Exam) {
  const result = exam.results[0];
  const now = new Date();
  const inWindow = new Date(exam.exam_date) <= now && (!exam.end_date || new Date(exam.end_date) > now);
  return inWindow && (!result || (result.attended && result.score === null));
}

export function StudentExams({ groupId, showGroup = false }: { groupId?: number; showGroup?: boolean }) {
  const { t, lang } = useI18n();
  const exams = useExams(groupId);
  const [answering, setAnswering] = useState<Exam | null>(null);
  const [viewing, setViewing] = useState<Exam | null>(null);
  const items = exams.data ?? [];

  return (
    <Card className="overflow-hidden">
      <h2 className="flex items-center gap-2 border-b border-border px-5 py-3.5 text-sm font-bold">
        <GraduationCap className="size-4 text-accent" aria-hidden />
        {t('exam.results')}
      </h2>
      <DataTable minWidth={showGroup ? 820 : 680}>
        <THead>
          <Tr>
            <Th>{t('exam.col')}</Th>
            {showGroup && <Th>{t('myResults.group')}</Th>}
            <Th>{t('exam.date')}</Th>
            <Th className="text-center">{t('exam.myResult')}</Th>
            <Th>{t('exam.statusCol')}</Th>
            <Th className="text-right">{t('exam.actionCol')}</Th>
          </Tr>
        </THead>
        <TBody>
          {items.map((exam) => {
            const date = new Date(exam.exam_date);
            const result = exam.results[0];
            const status = myExamStatus(exam);
            const open = canSubmit(exam);
            const hasAnswer = Boolean(result?.submitted_at);
            return (
              <Tr key={exam.id}>
                <Td>
                  <p className="font-semibold">{exam.title}</p>
                  {exam.description && <p className="max-w-80 truncate text-xs text-muted">{exam.description}</p>}
                </Td>
                {showGroup && <Td className="text-fg/85">{exam.groups?.name ?? '—'}</Td>}
                <Td className="whitespace-nowrap text-fg/85">{examWindow(exam, lang)}</Td>
                <Td className="text-center whitespace-nowrap tabular-nums">
                  {result?.attended && result.score !== null ? (
                    <>
                      <span className="font-bold">{result.score}</span>
                      <span className="text-muted"> / {exam.max_score}</span>
                    </>
                  ) : (
                    '—'
                  )}
                </Td>
                <Td>
                  <Badge tone={status.tone}>{t(status.label)}</Badge>
                </Td>
                <Td className="text-right">
                  <div className="inline-flex items-center gap-1.5">
                    {hasAnswer && (
                      <Button variant="ghost" icon={Eye} onClick={() => setViewing(exam)}>
                        {t('exam.viewAnswer')}
                      </Button>
                    )}
                    {open ? (
                      <Button
                        icon={Send}
                        variant={hasAnswer ? 'secondary' : 'primary'}
                        onClick={() => setAnswering(exam)}
                      >
                        {t(hasAnswer ? 'exam.resubmit' : 'exam.submit')}
                      </Button>
                    ) : (
                      !hasAnswer &&
                      (date > new Date() ? (
                        <span className="text-xs text-muted">{t('exam.notOpenYet')}</span>
                      ) : (
                        <span className="text-xs text-muted">{t('exam.timeOver')}</span>
                      ))
                    )}
                  </div>
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

      {answering && <ExamAnswerDialog exam={answering} onClose={() => setAnswering(null)} />}
      {viewing?.results[0] && (
        <Dialog open onClose={() => setViewing(null)} title={`${t('exam.answer')}: ${viewing.title}`}>
          <AnswerView exam={viewing} />
        </Dialog>
      )}
    </Card>
  );
}

export function AnswerView({ exam, index = 0 }: { exam: Pick<Exam, 'results'>; index?: number }) {
  const { t, lang } = useI18n();
  const result = exam.results[index];
  if (!result?.submitted_at) return <p className="text-sm text-muted">{t('exam.noAnswer')}</p>;
  const sent = new Date(result.submitted_at);
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted">
        {t('exam.submittedAt')}: {formatShortDate(sent, lang, true)}, {formatTime(sent)}
      </p>
      {result.answer_text && (
        <div className="rounded-xl border border-border p-4">
          <RichContent html={result.answer_text} />
        </div>
      )}
      {result.answer_file && (
        <a
          href={photoUrl(result.answer_file)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:underline"
        >
          <Paperclip className="size-4" aria-hidden />
          {result.answer_file.split('/').pop()}
        </a>
      )}
    </div>
  );
}

function ExamAnswerDialog({ exam, onClose }: { exam: Exam; onClose: () => void }) {
  const { t } = useI18n();
  const submit = useSubmitExamAnswer();
  const previous = exam.results[0];
  const [html, setHtml] = useState(previous?.answer_text ?? '');
  const [text, setText] = useState(previous?.answer_text ? 'x' : '');
  const [file, setFile] = useState<UploadedFile | null>(
    previous?.answer_file ? { url: previous.answer_file, name: previous.answer_file.split('/').pop() ?? '' } : null,
  );
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(false);
  const editorId = `exam-answer-${exam.id}`;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!text.trim() && !file) {
      setError(true);
      return;
    }
    submit.mutate(
      {
        id: exam.id,
        ...(text.trim() && { answer_text: html }),
        ...(file && { answer_file: file.url }),
      },
      { onSuccess: onClose },
    );
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={`${t('exam.answer')}: ${exam.title}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" form="exam-answer-form" icon={Send} loading={submit.isPending} disabled={uploading}>
            {t(previous?.submitted_at ? 'exam.resubmit' : 'exam.submit')}
          </Button>
        </>
      }
    >
      <form id="exam-answer-form" className="space-y-4" onSubmit={handleSubmit} noValidate>
        {submit.error ? <Alert>{apiErrorMessage(submit.error, t('error.unknown'))}</Alert> : null}
        {exam.description && <p className="text-sm text-muted">{exam.description}</p>}
        <div>
          <FormLabel htmlFor={editorId} className="mb-1.5 block">
            {t('exam.answer')}
          </FormLabel>
          <RichTextEditor
            id={editorId}
            label={t('exam.answer')}
            value={html}
            placeholder={t('exam.answerPlaceholder')}
            error={error}
            onChange={(nextHtml, nextText) => {
              setHtml(nextHtml);
              setText(nextText);
              setError(false);
            }}
          />
        </div>
        <div>
          <FormLabel className="mb-1.5 block">
            {t('homework.attachment')}
            <span className="ml-1 font-normal text-muted">({t('common.optional')})</span>
          </FormLabel>
          <FileDropzone
            file={file}
            onChange={(next) => {
              setFile(next);
              setError(false);
            }}
            onUploadingChange={setUploading}
          />
        </div>
        {error && <FormHelperText error>{t('exam.answerRequired')}</FormHelperText>}
      </form>
    </Dialog>
  );
}
