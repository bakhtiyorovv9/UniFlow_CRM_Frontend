'use client';

import { useState, type FormEvent } from 'react';
import { useI18n } from '../../../i18n/I18nProvider';
import type { MessageKey } from '../../../i18n/messages';
import { useSaveCourse, type Course, type Status } from '../api';
import { resourceStatus } from '../status';
import { Alert, Button, Dialog, SelectField, TextField, apiErrorMessage } from '../ui';
import { compact, required } from './validation';

type Props = { open: boolean; onClose: () => void; course?: Course };

type Values = {
  name: string;
  description: string;
  price: string;
  duration_month: string;
  duration_hours: string;
  status: Status;
};

type Errors = Partial<Record<keyof Values, MessageKey>>;

function wholeNumber(value: string, min: number): MessageKey | undefined {
  return (
    required(value) ??
    (Number.isInteger(Number(value)) && Number(value) >= min ? undefined : min === 0 ? 'form.minZero' : 'form.minOne')
  );
}

export function CourseFormDialog({ open, onClose, course }: Props) {
  const { t } = useI18n();
  const save = useSaveCourse();
  const [values, setValues] = useState<Values>({
    name: course?.name ?? '',
    description: course?.description ?? '',
    price: course ? String(Number(course.price)) : '',
    duration_month: course ? String(course.duration_month) : '',
    duration_hours: course ? String(course.duration_hours) : '',
    status: course?.status ?? 'active',
  });
  const [errors, setErrors] = useState<Errors>({});

  const set = <K extends keyof Values>(key: K, value: Values[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const found = compact<Errors>({
      name: required(values.name),
      price: required(values.price) ?? (Number(values.price) >= 0 ? undefined : 'form.minZero'),
      duration_month: wholeNumber(values.duration_month, 1),
      duration_hours: wholeNumber(values.duration_hours, 1),
    });
    setErrors(found);
    if (Object.keys(found).length) return;

    save.mutate(
      {
        id: course?.id,
        input: {
          name: values.name.trim(),
          ...(values.description.trim() && { description: values.description.trim() }),
          price: Number(values.price),
          duration_month: Number(values.duration_month),
          duration_hours: Number(values.duration_hours),
          ...(course && { status: values.status }),
        },
      },
      { onSuccess: onClose },
    );
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t(course ? 'form.courseEdit' : 'form.courseCreate')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" form="course-form" loading={save.isPending}>
            {t(save.isPending ? 'common.saving' : 'common.save')}
          </Button>
        </>
      }
    >
      <form id="course-form" className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit} noValidate>
        {save.error && (
          <div className="sm:col-span-2">
            <Alert>{apiErrorMessage(save.error, t('error.unknown'))}</Alert>
          </div>
        )}
        <div className="sm:col-span-2">
          <TextField
            label={t('field.courseName')}
            value={values.name}
            onChange={(e) => set('name', e.target.value)}
            error={errors.name}
            autoComplete="off"
          />
        </div>
        <TextField
          label={t('field.price')}
          type="number"
          min={0}
          step={1000}
          inputMode="numeric"
          value={values.price}
          onChange={(e) => set('price', e.target.value)}
          error={errors.price}
        />
        <TextField
          label={t('field.durationMonth')}
          type="number"
          min={1}
          inputMode="numeric"
          value={values.duration_month}
          onChange={(e) => set('duration_month', e.target.value)}
          error={errors.duration_month}
        />
        <TextField
          label={t('field.durationHours')}
          type="number"
          min={1}
          inputMode="numeric"
          value={values.duration_hours}
          onChange={(e) => set('duration_hours', e.target.value)}
          error={errors.duration_hours}
        />
        {course && (
          <SelectField
            label={t('field.status')}
            value={values.status}
            onChange={(e) => set('status', e.target.value as Status)}
          >
            {(Object.keys(resourceStatus) as Status[]).map((status) => (
              <option key={status} value={status}>
                {t(resourceStatus[status].label)}
              </option>
            ))}
          </SelectField>
        )}
        <div className="sm:col-span-2">
          <TextField
            label={t('field.description')}
            optional
            value={values.description}
            onChange={(e) => set('description', e.target.value)}
          />
        </div>
      </form>
    </Dialog>
  );
}
