'use client';

import Collapse from '@mui/material/Collapse';
import MuiIconButton from '@mui/material/IconButton';
import FormHelperText from '@mui/material/FormHelperText';
import FormLabel from '@mui/material/FormLabel';
import Tooltip from '@mui/material/Tooltip';
import { ChevronDown, ChevronLeft, CirclePlay, Paperclip, Send, VideoOff } from 'lucide-react';
import NextLink from 'next/link';
import { useMemo, useState, type FormEvent } from 'react';
import { FileDropzone, type UploadedFile } from '../../components/FileDropzone';
import { RichContent } from '../../components/RichContent';
import { RichTextEditor } from '../../components/RichTextEditor';
import { useI18n } from '../../i18n/I18nProvider';
import type { MessageKey } from '../../i18n/messages';
import { API_URL, photoUrl } from '../../lib/api';
import { formatShortDate, formatTime } from '../../lib/format';
import { homeworkDeadline, remainingParts } from '../../lib/schedule';
import type { Lesson, LessonVideo } from '../admin/api';
import {
  useGroupDetail,
  useGroupHomeworks,
  useGroupLessons,
  useGroupVideos,
  type GroupDetail,
  type Homework,
  type HomeworkAnswer,
} from '../admin/group/groupApi';
import { groupStatus } from '../admin/status';
import { Alert, Badge, Button, Card, StateMessage, apiErrorMessage, type BadgeTone } from '../admin/ui';
import { useSetUrlParams, useUrlState } from '../admin/useUrlState';
import { StudentExams } from './StudentExams';
import { latestAnswers, useMyAnswers, useSubmitAnswer } from './studentApi';

const API_ORIGIN = API_URL.replace(/\/api\/?$/, '');

const ANSWER_STATUS: Record<HomeworkAnswer['homeworkStatus'] | 'NONE', { label: MessageKey; tone: BadgeTone }> = {
  NONE: { label: 'studentGroup.status.NONE', tone: 'neutral' },
  PENDING: { label: 'studentGroup.status.PENDING', tone: 'warning' },
  REJECTED: { label: 'studentGroup.status.REJECTED', tone: 'danger' },
  ACCEPTED: { label: 'studentGroup.status.ACCEPTED', tone: 'success' },
  CHECKED: { label: 'studentGroup.status.CHECKED', tone: 'success' },
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
}

function useDateTime() {
  const { lang } = useI18n();
  return (value: Date | string) => {
    const date = new Date(value);
    return `${formatShortDate(date, lang, true)}, ${formatTime(date)}`;
  };
}

export function StudentGroupPage({ groupId }: { groupId: number }) {
  const { t, lang } = useI18n();
  const group = useGroupDetail(groupId);
  const lessons = useGroupLessons(groupId);
  const videos = useGroupVideos(groupId);
  const homeworks = useGroupHomeworks(groupId);
  const answers = useMyAnswers();
  const [lessonParam] = useUrlState('lesson', '');
  const [videoParam] = useUrlState('video', '');
  const setParams = useSetUrlParams();
  const [openOverrides, setOpenOverrides] = useState<Record<number, boolean>>({});

  const lessonList = lessons.data ?? [];
  const videosByLesson = useMemo(() => {
    const map = new Map<number, LessonVideo[]>();
    [...(videos.data ?? [])]
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .forEach((video) => map.set(video.lesson_id, [...(map.get(video.lesson_id) ?? []), video]));
    return map;
  }, [videos.data]);
  const myAnswers = useMemo(() => latestAnswers(answers.data), [answers.data]);

  const lesson = lessonList.find((item) => String(item.id) === lessonParam) ?? lessonList[0];
  const lessonVideos = lesson ? (videosByLesson.get(lesson.id) ?? []) : [];
  const video = lessonVideos.find((item) => String(item.id) === videoParam) ?? lessonVideos[0];
  const lessonHomeworks = (homeworks.data ?? []).filter((homework) => lesson && homework.lesson_id === lesson.id);

  function selectLesson(item: Lesson, videoId?: number) {
    setParams({ lesson: String(item.id), video: videoId ? String(videoId) : '' });
  }

  function toggle(id: number, open: boolean) {
    setOpenOverrides((current) => ({ ...current, [id]: !open }));
  }

  if (!group.data) {
    return (
      <div className="space-y-4">
        <BackLink />
        <StateMessage loading={group.isPending} error={group.isError} empty={false} onRetry={() => group.refetch()} />
      </div>
    );
  }

  const status = groupStatus[group.data.status];
  const isOpen = (id: number) => openOverrides[id] ?? id === lesson?.id;

  const lessonsPanel = (
    <Card className="overflow-hidden">
      <h2 className="border-b border-border px-4 py-3 text-sm font-bold">
        {t('studentGroup.lessons')} <span className="font-normal text-muted">({lessonList.length})</span>
      </h2>
      <ul className="max-h-[70vh] divide-y divide-border overflow-y-auto">
        {lessonList.map((item) => {
          const selected = item.id === lesson?.id;
          const itemVideos = videosByLesson.get(item.id) ?? [];
          const open = isOpen(item.id);
          return (
            <li key={item.id} className={selected ? 'bg-accent-bg' : undefined}>
              <div className="flex items-center gap-1 pr-2">
                <button
                  type="button"
                  onClick={() => selectLesson(item)}
                  aria-current={selected ? 'true' : undefined}
                  className="min-w-0 flex-1 cursor-pointer px-4 py-3 text-left"
                >
                  <p className={`truncate text-sm font-semibold ${selected ? 'text-accent' : ''}`}>{item.topic}</p>
                  <p className="text-xs text-muted">
                    {t('studentGroup.lessonDate')}: {formatShortDate(new Date(item.created_at), lang, true)}
                  </p>
                </button>
                {itemVideos.length > 0 && (
                  <MuiIconButton
                    size="small"
                    onClick={() => toggle(item.id, open)}
                    aria-expanded={open}
                    aria-label={item.topic}
                  >
                    <ChevronDown className={`size-4 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
                  </MuiIconButton>
                )}
              </div>
              {itemVideos.length > 0 && (
                <Collapse in={open}>
                  <ul className="space-y-1 px-3 pb-3">
                    {itemVideos.map((itemVideo, index) => {
                      const playing = selected && itemVideo.id === video?.id;
                      return (
                        <li key={itemVideo.id}>
                          <button
                            type="button"
                            onClick={() => selectLesson(item, itemVideo.id)}
                            aria-current={playing ? 'true' : undefined}
                            className={`flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition-colors ${
                              playing ? 'bg-primary text-white' : 'bg-surface hover:bg-surface-hover'
                            }`}
                          >
                            <CirclePlay className="size-4 shrink-0" aria-hidden />
                            <span className="min-w-0 truncate">
                              <span className="font-bold">{t('studentGroup.video', { n: String(index + 1) })}:</span>{' '}
                              {itemVideo.originalname}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </Collapse>
              )}
            </li>
          );
        })}
      </ul>
      <StateMessage
        loading={lessons.isPending}
        error={lessons.isError}
        empty={lessonList.length === 0}
        emptyText={t('studentGroup.noLessons')}
        onRetry={() => lessons.refetch()}
      />
    </Card>
  );

  return (
    <div className="space-y-5">
      <div className="flex min-w-0 items-center gap-2">
        <BackLink />
        <h1 className="truncate text-2xl font-bold tracking-tight">{group.data.name}</h1>
        <Badge tone={status.tone}>{t(status.label)}</Badge>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-4">
          <Card className="overflow-hidden">
            <div className="aspect-video bg-black">
              {video ? (
                <video
                  key={video.id}
                  src={`${API_ORIGIN}${video.video_url}`}
                  controls
                  preload="metadata"
                  className="size-full"
                  aria-label={video.originalname}
                />
              ) : (
                <div className="flex size-full flex-col items-center justify-center gap-2 text-center text-sm text-white/70">
                  <VideoOff className="size-8" aria-hidden />
                  {lesson ? t('studentGroup.noVideo') : t('studentGroup.pickLesson')}
                </div>
              )}
            </div>
            {lesson && (
              <div className="flex flex-wrap items-baseline gap-x-2 px-5 py-3.5">
                <h2 className="font-bold">{lesson.topic}</h2>
                {video && <span className="text-sm text-muted">({video.originalname})</span>}
              </div>
            )}
          </Card>

          <div className="lg:hidden">{lessonsPanel}</div>

          {lesson && (
            <section aria-labelledby="lesson-homework" className="space-y-3">
              <h2 id="lesson-homework" className="text-lg font-bold">
                {t('studentGroup.homework')}
              </h2>
              {homeworks.isPending ? (
                <StateMessage loading error={false} empty={false} />
              ) : lessonHomeworks.length === 0 ? (
                <Card className="px-5 py-8 text-center text-sm text-muted">{t('studentGroup.noHomework')}</Card>
              ) : (
                lessonHomeworks.map((homework) => (
                  <HomeworkCard
                    key={homework.id}
                    homework={homework}
                    group={group.data}
                    answer={myAnswers.get(homework.id)}
                  />
                ))
              )}
            </section>
          )}
          <StudentExams groupId={groupId} />
        </div>

        <div className="hidden lg:sticky lg:top-20 lg:block">{lessonsPanel}</div>
      </div>
    </div>
  );
}

function BackLink() {
  const { t } = useI18n();
  return (
    <Tooltip title={t('group.back')}>
      <MuiIconButton component={NextLink} href="/groups" aria-label={t('group.back')}>
        <ChevronLeft className="size-5" aria-hidden />
      </MuiIconButton>
    </Tooltip>
  );
}

function HomeworkCard({
  homework,
  group,
  answer,
}: {
  homework: Homework;
  group: GroupDetail;
  answer?: HomeworkAnswer;
}) {
  const { t } = useI18n();
  const dateTime = useDateTime();
  const deadline = homeworkDeadline(homework.created_at);
  const left = remainingParts(deadline);
  const expired = left.total === 0;
  const status = ANSWER_STATUS[answer?.homeworkStatus ?? 'NONE'];
  const result = answer?.homeworkResults?.[0];
  const closed = group.status === 'completed' || group.status === 'inactive';
  const canSubmit = !closed && (!answer || answer.homeworkStatus === 'REJECTED');

  return (
    <Card className="overflow-hidden">
      <div className="space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-x-8 gap-y-1 text-xs text-muted">
            <span>
              {t('homework.given')}: <span className="font-semibold text-fg">{dateTime(homework.created_at)}</span>
            </span>
            <span>
              {t('studentGroup.deadline')}: <span className="font-semibold text-fg">{dateTime(deadline)}</span>
            </span>
            {!expired && (
              <span className="font-semibold text-warning">
                {t('studentGroup.timeLeft', {
                  time: left.hours
                    ? t('time.hm', { h: String(left.hours), m: String(left.minutes) })
                    : t('time.m', { m: String(left.minutes) }),
                })}
              </span>
            )}
          </div>
          <Badge tone={status.tone}>{t(status.label)}</Badge>
        </div>

        <RichContent html={homework.title} />

        {homework.file && (
          <a
            href={photoUrl(homework.file)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:underline"
          >
            <Paperclip className="size-4" aria-hidden />
            {t('studentGroup.attachment')}: {homework.file.split('/').pop()}
          </a>
        )}
      </div>

      {answer && (
        <div className="space-y-3 border-t border-border bg-bg/40 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-bold">{t('studentGroup.myAnswer')}</h3>
            <span className="text-xs text-muted">
              {t('studentGroup.sentAt')}: {dateTime(answer.created_at)}
            </span>
          </div>
          <RichContent html={answer.title} />
          {answer.file && (
            <a
              href={photoUrl(answer.file)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:underline"
            >
              <Paperclip className="size-4" aria-hidden />
              {answer.file.split('/').pop()}
            </a>
          )}
          {result && answer.homeworkStatus !== 'PENDING' && (
            <div className="rounded-xl border border-border bg-surface p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-muted">{t('studentGroup.teacherComment')}</p>
                <p className="text-sm">
                  {t('studentGroup.grade')}: <span className="font-bold tabular-nums">{result.grade}</span>
                </p>
              </div>
              <p className="mt-1.5 text-sm whitespace-pre-line">{result.title}</p>
            </div>
          )}
        </div>
      )}

      {canSubmit && (
        <div className="border-t border-border p-5">
          {expired ? (
            <p className="mb-3 rounded-xl border border-danger-border bg-danger-bg px-3 py-2 text-sm text-danger">
              {t('studentGroup.deadlinePassed')}
            </p>
          ) : (
            answer?.homeworkStatus === 'REJECTED' && (
              <p className="mb-3 text-sm text-danger">{t('studentGroup.returnedHint')}</p>
            )
          )}
          <AnswerForm homeworkId={homework.id} resubmit={Boolean(answer)} />
        </div>
      )}
    </Card>
  );
}

function AnswerForm({ homeworkId, resubmit }: { homeworkId: number; resubmit: boolean }) {
  const { t } = useI18n();
  const submit = useSubmitAnswer();
  const [html, setHtml] = useState('');
  const [text, setText] = useState('');
  const [file, setFile] = useState<UploadedFile | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(false);
  const editorId = `answer-${homeworkId}`;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!text.trim() && !file) {
      setError(true);
      return;
    }
    submit.mutate({
      homework_id: homeworkId,
      title: text.trim() ? html : `<p>${escapeHtml(file?.name ?? '')}</p>`,
      ...(file && { file: file.url }),
    });
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit} noValidate>
      {submit.error ? <Alert>{apiErrorMessage(submit.error, t('error.unknown'))}</Alert> : null}
      <div>
        <FormLabel htmlFor={editorId} className="mb-1.5 block">
          {t('studentGroup.myAnswer')}
        </FormLabel>
        <RichTextEditor
          id={editorId}
          label={t('studentGroup.myAnswer')}
          value={html}
          placeholder={t('studentGroup.answerPlaceholder')}
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
      {error && <FormHelperText error>{t('studentGroup.answerRequired')}</FormHelperText>}
      <div className="flex justify-end">
        <Button type="submit" icon={Send} loading={submit.isPending} disabled={uploading}>
          {resubmit ? t('studentGroup.resubmit') : t('studentGroup.submit')}
        </Button>
      </div>
    </form>
  );
}
