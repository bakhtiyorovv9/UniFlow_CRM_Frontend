'use client';

import MuiButton from '@mui/material/Button';
import FormHelperText from '@mui/material/FormHelperText';
import FormLabel from '@mui/material/FormLabel';
import LinearProgress from '@mui/material/LinearProgress';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Tooltip from '@mui/material/Tooltip';
import {
  CircleCheck,
  Clock,
  ExternalLink,
  Eye,
  ListChecks,
  Paperclip,
  Plus,
  Trash2,
  Upload,
  UserRound,
} from 'lucide-react';
import NextLink from 'next/link';
import { useRouter } from 'next/navigation';
import { RichContent, stripHtml } from '../../../components/RichContent';
import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { useI18n } from '../../../i18n/I18nProvider';
import type { MessageKey } from '../../../i18n/messages';
import { API_URL, photoUrl } from '../../../lib/api';
import { formatShortDate, formatTime } from '../../../lib/format';
import type { Lesson, LessonVideo } from '../api';
import { required } from '../forms/validation';
import {
  Alert,
  Button,
  Card,
  ConfirmDelete,
  DataTable,
  Dialog,
  RowMenu,
  SelectField,
  StateMessage,
  TBody,
  THead,
  Td,
  TextField,
  Th,
  Tr,
  apiErrorMessage,
} from '../ui';
import { homeworkDeadline } from '../../../lib/schedule';
import { useUrlState } from '../useUrlState';
import { ExamsSection } from './ExamsSection';
import {
  useCreateLesson,
  useDeleteGroupItem,
  useGroupHomeworks,
  useGroupVideos,
  useGroupAnswers,
  useUploadVideo,
  type Homework,
} from './groupApi';

type Section = 'homework' | 'videos' | 'exams' | 'lessons';

const API_ORIGIN = API_URL.replace(/\/api\/?$/, '');

function dateTime(value: string, lang: 'uz' | 'ru' | 'en') {
  const date = new Date(value);
  return `${formatShortDate(date, lang, true)}, ${formatTime(date)}`;
}

function SectionShell({ children }: { children: ReactNode }) {
  return <Card className="overflow-hidden">{children}</Card>;
}

export function MaterialsTab({
  groupId,
  lessons,
  lessonsLoading,
  closed = false,
}: {
  groupId: number;
  lessons: Lesson[];
  lessonsLoading: boolean;
  closed?: boolean;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [section, setSection] = useUrlState<Section>('section', 'homework');
  const [adding, setAdding] = useState<Section | null>(null);

  const sections: { value: Section; label: MessageKey }[] = [
    { value: 'homework', label: 'materials.homework' },
    { value: 'videos', label: 'materials.videos' },
    { value: 'exams', label: 'materials.exams' },
    { value: 'lessons', label: 'materials.journal' },
  ];

  function handleAdd() {
    if (section === 'homework') router.push(`/groups/${groupId}/homework/create`);
    else setAdding(section);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <h2 className="text-lg font-bold">{t('group.tabMaterials')}</h2>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={section}
          onChange={(_, value: Section | null) => value && setSection(value)}
          aria-label={t('group.tabMaterials')}
        >
          {sections.map((item) => (
            <ToggleButton key={item.value} value={item.value} sx={{ px: 2 }}>
              {t(item.label)}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
        {!closed && (
          <div className="ml-auto">
            <Button icon={section === 'videos' ? Upload : Plus} onClick={handleAdd}>
              {section === 'videos' ? t('video.upload') : t('materials.add')}
            </Button>
          </div>
        )}
      </div>

      {section === 'homework' && <HomeworkSection groupId={groupId} lessons={lessons} />}
      {section === 'videos' && (
        <VideosSection
          lessons={lessons}
          groupId={groupId}
          uploading={adding === 'videos'}
          onCloseUpload={() => setAdding(null)}
        />
      )}
      {section === 'exams' && (
        <ExamsSection
          groupId={groupId}
          creating={adding === 'exams'}
          onCloseCreate={() => setAdding(null)}
          closed={closed}
        />
      )}
      {section === 'lessons' && (
        <LessonsSection
          groupId={groupId}
          lessons={lessons}
          loading={lessonsLoading}
          creating={adding === 'lessons'}
          onCloseCreate={() => setAdding(null)}
        />
      )}
    </div>
  );
}

function LessonsSection({
  groupId,
  lessons,
  loading,
  creating,
  onCloseCreate,
}: {
  groupId: number;
  lessons: Lesson[];
  loading: boolean;
  creating: boolean;
  onCloseCreate: () => void;
}) {
  const { t, lang } = useI18n();
  const [toDelete, setToDelete] = useState<Lesson | null>(null);
  const remove = useDeleteGroupItem('/lessons');

  return (
    <SectionShell>
      <DataTable minWidth={640}>
        <THead>
          <Tr>
            <Th className="w-10">#</Th>
            <Th>{t('lesson.topic')}</Th>
            <Th>{t('lesson.author')}</Th>
            <Th>{t('lesson.date')}</Th>
            <Th className="w-12">
              <span className="sr-only">{t('col.actions')}</span>
            </Th>
          </Tr>
        </THead>
        <TBody>
          {lessons.map((lesson, index) => (
            <Tr key={lesson.id}>
              <Td className="text-muted">{lessons.length - index}</Td>
              <Td>
                <p className="font-semibold">{lesson.topic}</p>
                {lesson.description && <p className="max-w-96 truncate text-xs text-muted">{lesson.description}</p>}
              </Td>
              <Td className="text-fg/85">{lesson.teachers?.full_name ?? t('role.ADMIN')}</Td>
              <Td className="whitespace-nowrap text-fg/85">{dateTime(lesson.created_at, lang)}</Td>
              <Td className="text-right">
                <RowMenu
                  label={`${t('col.actions')}: ${lesson.topic}`}
                  items={[
                    {
                      label: t('common.delete'),
                      icon: Trash2,
                      danger: true,
                      onSelect: () => {
                        remove.reset();
                        setToDelete(lesson);
                      },
                    },
                  ]}
                />
              </Td>
            </Tr>
          ))}
        </TBody>
      </DataTable>
      <StateMessage loading={loading} error={false} empty={lessons.length === 0} emptyText={t('lesson.empty')} />

      {creating && <LessonDialog groupId={groupId} onClose={onCloseCreate} />}
      <ConfirmDelete
        open={Boolean(toDelete)}
        name={toDelete?.topic ?? ''}
        onClose={() => setToDelete(null)}
        onConfirm={() => toDelete && remove.mutate(toDelete.id, { onSuccess: () => setToDelete(null) })}
        pending={remove.isPending}
        error={remove.error}
      />
    </SectionShell>
  );
}

function LessonDialog({ groupId, onClose }: { groupId: number; onClose: () => void }) {
  const { t } = useI18n();
  const create = useCreateLesson();
  const [topic, setTopic] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<MessageKey | undefined>();

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const found = required(topic);
    setError(found);
    if (found) return;
    create.mutate(
      { group_id: groupId, topic: topic.trim(), ...(description.trim() && { description: description.trim() }) },
      { onSuccess: onClose },
    );
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={t('lesson.create')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" form="lesson-form" loading={create.isPending}>
            {t('common.save')}
          </Button>
        </>
      }
    >
      <form id="lesson-form" className="space-y-4" onSubmit={handleSubmit} noValidate>
        {create.error ? <Alert>{apiErrorMessage(create.error, t('error.unknown'))}</Alert> : null}
        <TextField
          label={t('lesson.topic')}
          value={topic}
          onChange={(event) => {
            setTopic(event.target.value);
            setError(undefined);
          }}
          error={error}
          autoFocus
        />
        <TextField
          label={t('lesson.description')}
          optional
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </form>
    </Dialog>
  );
}

function HomeworkSection({ groupId, lessons }: { groupId: number; lessons: Lesson[] }) {
  const { t, lang } = useI18n();
  const homeworks = useGroupHomeworks(groupId);
  const answers = useGroupAnswers(groupId);
  const router = useRouter();
  const [viewing, setViewing] = useState<Homework | null>(null);
  const [toDelete, setToDelete] = useState<Homework | null>(null);
  const remove = useDeleteGroupItem('/homeworks');

  const stats = useMemo(() => {
    const map = new Map<number, { submitted: number; pending: number; checked: number }>();
    answers.data?.forEach((answer) => {
      const entry = map.get(answer.homework_id) ?? { submitted: 0, pending: 0, checked: 0 };
      entry.submitted++;
      if (answer.homeworkStatus === 'PENDING') entry.pending++;
      else entry.checked++;
      map.set(answer.homework_id, entry);
    });
    return map;
  }, [answers.data]);

  const resultsHref = (homework: Homework) => `/groups/${groupId}/homework/${homework.id}`;
  const lessonDate = useMemo(() => new Map(lessons.map((lesson) => [lesson.id, lesson.created_at])), [lessons]);
  const items = homeworks.data ?? [];

  const statHeader = (icon: ReactNode, label: string) => (
    <Tooltip title={label}>
      <span className="inline-flex items-center justify-center" aria-label={label}>
        {icon}
      </span>
    </Tooltip>
  );

  return (
    <SectionShell>
      <DataTable minWidth={820}>
        <THead>
          <Tr>
            <Th className="w-10">#</Th>
            <Th>{t('lesson.topic')}</Th>
            <Th className="text-center">
              {statHeader(<UserRound className="size-4" aria-hidden />, t('homework.submitted'))}
            </Th>
            <Th className="text-center">
              {statHeader(<Clock className="size-4 text-warning" aria-hidden />, t('homework.pending'))}
            </Th>
            <Th className="text-center">
              {statHeader(<CircleCheck className="size-4 text-success" aria-hidden />, t('homework.checked'))}
            </Th>
            <Th>{t('homework.given')}</Th>
            <Th>{t('lesson.date')}</Th>
            <Th className="w-12">
              <span className="sr-only">{t('col.actions')}</span>
            </Th>
          </Tr>
        </THead>
        <TBody>
          {items.map((homework, index) => {
            const stat = stats.get(homework.id) ?? { submitted: 0, pending: 0, checked: 0 };
            const lessonCreated = homework.lesson_id ? lessonDate.get(homework.lesson_id) : undefined;
            return (
              <Tr key={homework.id} onClick={() => router.push(resultsHref(homework))}>
                <Td className="text-muted">{items.length - index}</Td>
                <Td>
                  <NextLink
                    href={resultsHref(homework)}
                    className="block max-w-96 truncate font-semibold hover:underline"
                  >
                    {stripHtml(homework.title)}
                  </NextLink>
                  <p className="flex items-center gap-1 text-xs text-muted">
                    {homework.lesson?.topic}
                    {homework.file && <Paperclip className="size-3" aria-label={t('homework.attachment')} />}
                  </p>
                </Td>
                <Td className="text-center font-semibold tabular-nums">{stat.submitted}</Td>
                <Td className="text-center font-semibold text-warning tabular-nums">{stat.pending}</Td>
                <Td className="text-center font-semibold text-success tabular-nums">{stat.checked}</Td>
                <Td className="whitespace-nowrap text-fg/85">
                  {dateTime(homework.created_at, lang)}
                  <p
                    className={`text-xs ${homeworkDeadline(homework.created_at) < new Date() ? 'text-muted' : 'font-semibold text-warning'}`}
                  >
                    {t('homework.deadlineShort')}: {dateTime(homeworkDeadline(homework.created_at).toISOString(), lang)}
                  </p>
                </Td>
                <Td className="whitespace-nowrap text-fg/85">
                  {lessonCreated ? formatShortDate(new Date(lessonCreated), lang, true) : '—'}
                </Td>
                <Td className="text-right">
                  <RowMenu
                    label={`${t('col.actions')}: ${stripHtml(homework.title)}`}
                    items={[
                      {
                        label: t('homework.results'),
                        icon: ListChecks,
                        onSelect: () => router.push(resultsHref(homework)),
                      },
                      { label: t('homework.view'), icon: Eye, onSelect: () => setViewing(homework) },
                      {
                        label: t('common.delete'),
                        icon: Trash2,
                        danger: true,
                        onSelect: () => {
                          remove.reset();
                          setToDelete(homework);
                        },
                      },
                    ]}
                  />
                </Td>
              </Tr>
            );
          })}
        </TBody>
      </DataTable>
      <StateMessage
        loading={homeworks.isPending}
        error={homeworks.isError}
        empty={items.length === 0}
        emptyText={t('homework.empty')}
        onRetry={() => homeworks.refetch()}
      />

      {viewing && (
        <Dialog open onClose={() => setViewing(null)} title={viewing.lesson?.topic ?? t('materials.homework')}>
          <div className="space-y-4">
            <RichContent html={viewing.title} />
            {viewing.file && (
              <a
                href={photoUrl(viewing.file)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:underline"
              >
                <Paperclip className="size-4" aria-hidden />
                {t('homework.attachment')}: {viewing.file.split('/').pop()}
              </a>
            )}
            <p className="text-xs text-muted">
              {t('homework.given')}: {dateTime(viewing.created_at, lang)}
            </p>
          </div>
        </Dialog>
      )}
      <ConfirmDelete
        open={Boolean(toDelete)}
        name={toDelete ? stripHtml(toDelete.title).slice(0, 60) : ''}
        onClose={() => setToDelete(null)}
        onConfirm={() => toDelete && remove.mutate(toDelete.id, { onSuccess: () => setToDelete(null) })}
        pending={remove.isPending}
        error={remove.error}
      />
    </SectionShell>
  );
}

function VideosSection({
  groupId,
  lessons,
  uploading,
  onCloseUpload,
}: {
  groupId: number;
  lessons: Lesson[];
  uploading: boolean;
  onCloseUpload: () => void;
}) {
  const { t, lang } = useI18n();
  const videos = useGroupVideos(groupId);
  const [toDelete, setToDelete] = useState<LessonVideo | null>(null);
  const remove = useDeleteGroupItem('/lesson-videos');
  const items = videos.data ?? [];

  return (
    <SectionShell>
      <DataTable minWidth={720}>
        <THead>
          <Tr>
            <Th className="w-10">#</Th>
            <Th>{t('video.file')}</Th>
            <Th>{t('homework.lesson')}</Th>
            <Th>{t('video.size')}</Th>
            <Th>{t('homework.given')}</Th>
            <Th className="w-12">
              <span className="sr-only">{t('col.actions')}</span>
            </Th>
          </Tr>
        </THead>
        <TBody>
          {items.map((video, index) => (
            <Tr key={video.id}>
              <Td className="text-muted">{items.length - index}</Td>
              <Td>
                <a
                  href={`${API_ORIGIN}${video.video_url}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 font-semibold hover:underline"
                >
                  {video.originalname}
                  <ExternalLink className="size-3.5 text-muted" aria-label={t('video.watch')} />
                </a>
              </Td>
              <Td className="text-fg/85">{video.lesson.topic}</Td>
              <Td className="whitespace-nowrap tabular-nums text-fg/85">{video.size_mb.toFixed(1)} MB</Td>
              <Td className="whitespace-nowrap text-fg/85">{dateTime(video.created_at, lang)}</Td>
              <Td className="text-right">
                <RowMenu
                  label={`${t('col.actions')}: ${video.originalname}`}
                  items={[
                    {
                      label: t('common.delete'),
                      icon: Trash2,
                      danger: true,
                      onSelect: () => {
                        remove.reset();
                        setToDelete(video);
                      },
                    },
                  ]}
                />
              </Td>
            </Tr>
          ))}
        </TBody>
      </DataTable>
      <StateMessage
        loading={videos.isPending}
        error={videos.isError}
        empty={items.length === 0}
        emptyText={t('video.empty')}
        onRetry={() => videos.refetch()}
      />

      {uploading && <VideoDialog lessons={lessons} onClose={onCloseUpload} />}
      <ConfirmDelete
        open={Boolean(toDelete)}
        name={toDelete?.originalname ?? ''}
        onClose={() => setToDelete(null)}
        onConfirm={() => toDelete && remove.mutate(toDelete.id, { onSuccess: () => setToDelete(null) })}
        pending={remove.isPending}
        error={remove.error}
      />
    </SectionShell>
  );
}

function VideoDialog({ lessons, onClose }: { lessons: Lesson[]; onClose: () => void }) {
  const { t } = useI18n();
  const [progress, setProgress] = useState(0);
  const upload = useUploadVideo(setProgress);
  const [lessonId, setLessonId] = useState(String(lessons[0]?.id ?? ''));
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState(false);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!file) {
      setFileError(true);
      return;
    }
    setProgress(0);
    upload.mutate({ lessonId: Number(lessonId), file }, { onSuccess: onClose });
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={t('video.upload')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" form="video-form" loading={upload.isPending} disabled={lessons.length === 0}>
            {t('video.upload')}
          </Button>
        </>
      }
    >
      <form id="video-form" className="space-y-4" onSubmit={handleSubmit} noValidate>
        {lessons.length === 0 && <Alert>{t('homework.needLesson')}</Alert>}
        {upload.error ? <Alert>{apiErrorMessage(upload.error, t('error.unknown'))}</Alert> : null}
        <SelectField
          label={t('homework.lesson')}
          value={lessonId}
          onChange={(event) => setLessonId(event.target.value)}
        >
          {lessons.map((lesson) => (
            <option key={lesson.id} value={lesson.id}>
              {lesson.topic}
            </option>
          ))}
        </SelectField>
        <div>
          <FormLabel className="mb-1.5 block">{t('video.file')}</FormLabel>
          <div className="flex flex-wrap items-center gap-3">
            <MuiButton
              component="label"
              variant="outlined"
              color="inherit"
              startIcon={<Upload className="size-4" aria-hidden />}
            >
              {t('video.chooseFile')}
              <input
                type="file"
                hidden
                accept="video/mp4,video/quicktime,video/x-msvideo,video/webm,video/x-matroska,.mp4,.mov,.avi,.webm,.mkv"
                onChange={(event) => {
                  setFile(event.target.files?.[0] ?? null);
                  setFileError(false);
                }}
              />
            </MuiButton>
            <span className="min-w-0 truncate text-sm">{file?.name}</span>
          </div>
          <FormHelperText error={fileError}>{fileError ? t('video.fileRequired') : t('video.formats')}</FormHelperText>
        </div>
        {upload.isPending && (
          <div>
            <LinearProgress variant="determinate" value={progress} sx={{ height: 6, borderRadius: 999 }} />
            <p className="mt-1 text-xs text-muted">{t('video.uploading', { percent: String(progress) })}</p>
          </div>
        )}
      </form>
    </Dialog>
  );
}
