'use client';

import MuiAlert from '@mui/material/Alert';
import FormHelperText from '@mui/material/FormHelperText';
import FormLabel from '@mui/material/FormLabel';
import MuiIconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import { ChevronLeft } from 'lucide-react';
import NextLink from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { FileDropzone, type UploadedFile } from '../../components/FileDropzone';
import { RichTextEditor } from '../../components/RichTextEditor';
import { useI18n } from '../../i18n/I18nProvider';
import type { MessageKey } from '../../i18n/messages';
import { useCreateHomework, useGroupDetail, useGroupLessons } from '../admin/group/groupApi';
import { Alert, Button, SelectField, apiErrorMessage } from '../admin/ui';

export function HomeworkCreatePage({ groupId }: { groupId: number }) {
  const { t } = useI18n();
  const router = useRouter();
  const lessons = useGroupLessons(groupId);
  const group = useGroupDetail(groupId);
  const closed = group.data?.status === 'completed' || group.data?.status === 'inactive';
  const create = useCreateHomework();

  const [lessonId, setLessonId] = useState('');
  const [html, setHtml] = useState('');
  const [text, setText] = useState('');
  const [file, setFile] = useState<UploadedFile | null>(null);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<{ lesson?: MessageKey; description?: MessageKey }>({});

  const backHref = `/groups/${groupId}?tab=materials&section=homework`;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const found = {
      lesson: lessonId ? undefined : ('form.required' as const),
      description: text ? undefined : ('homeworkForm.descriptionRequired' as const),
    };
    setErrors(found);
    if (found.lesson || found.description) return;
    create.mutate(
      { group_id: groupId, lesson_id: Number(lessonId), title: html, ...(file && { file: file.url }) },
      { onSuccess: () => router.push(backHref) },
    );
  }

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex items-center gap-2">
        <Tooltip title={t('group.back')}>
          <MuiIconButton component={NextLink} href={backHref} aria-label={t('group.back')}>
            <ChevronLeft className="size-5" aria-hidden />
          </MuiIconButton>
        </Tooltip>
        <h1 className="text-2xl font-bold tracking-tight">{t('homeworkForm.title')}</h1>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit} noValidate>
        <MuiAlert severity="info" variant="outlined" sx={{ borderRadius: 2 }}>
          {t('homework.deadlineRule')}
        </MuiAlert>
        {create.error ? <Alert>{apiErrorMessage(create.error, t('error.unknown'))}</Alert> : null}
        {closed && <Alert>{t('group.closedNotice')}</Alert>}
        {lessons.isSuccess && lessons.data.length === 0 && <Alert>{t('homework.needLesson')}</Alert>}

        <SelectField
          label={t('homeworkForm.topic')}
          value={lessonId}
          onChange={(event) => {
            setLessonId(event.target.value);
            setErrors((current) => ({ ...current, lesson: undefined }));
          }}
          error={errors.lesson}
        >
          <option value="">{t('homeworkForm.topicPlaceholder')}</option>
          {lessons.data?.map((lesson) => (
            <option key={lesson.id} value={lesson.id}>
              {lesson.topic}
            </option>
          ))}
        </SelectField>

        <div>
          <FormLabel htmlFor="homework-description" className="mb-1.5 block">
            {t('homeworkForm.description')}
          </FormLabel>
          <RichTextEditor
            id="homework-description"
            label={t('homeworkForm.description')}
            value={html}
            placeholder={t('homeworkForm.descriptionPlaceholder')}
            error={Boolean(errors.description)}
            onChange={(nextHtml, nextText) => {
              setHtml(nextHtml);
              setText(nextText);
              setErrors((current) => ({ ...current, description: undefined }));
            }}
          />
          {errors.description && <FormHelperText error>{t(errors.description)}</FormHelperText>}
        </div>

        <div>
          <FormLabel className="mb-1.5 block">
            {t('homework.attachment')}
            <span className="ml-1 font-normal text-muted">({t('common.optional')})</span>
          </FormLabel>
          <FileDropzone file={file} onChange={setFile} onUploadingChange={setUploading} />
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => router.push(backHref)}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" loading={create.isPending} disabled={closed || uploading || lessons.data?.length === 0}>
            {t('homeworkForm.publish')}
          </Button>
        </div>
      </form>
    </div>
  );
}
