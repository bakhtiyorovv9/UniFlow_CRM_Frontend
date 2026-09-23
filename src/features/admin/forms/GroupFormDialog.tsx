'use client';

import FormHelperText from '@mui/material/FormHelperText';
import FormLabel from '@mui/material/FormLabel';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import { useState, type FormEvent } from 'react';
import { useI18n } from '../../../i18n/I18nProvider';
import type { MessageKey } from '../../../i18n/messages';
import { WEEK_DAY_SHORT, toDateInput } from '../../../lib/format';
import {
  WEEK_DAYS,
  useCourses,
  useGroupTeacherLinks,
  useRooms,
  useSaveGroup,
  useTeachers,
  type Group,
  type GroupStatus,
  type WeekDay,
} from '../api';
import { activeLinks } from '../derive';
import { groupStatus } from '../status';
import { Alert, Button, Dialog, SelectField, TextField, apiErrorMessage } from '../ui';
import { compact, required } from './validation';

type Props = { open: boolean; onClose: () => void; group?: Group };

type Values = {
  name: string;
  description: string;
  course_id: string;
  room_id: string;
  teacher_id: string;
  start_date: string;
  start_time: string;
  max_student: string;
  week_day: WeekDay[];
  status: GroupStatus;
};

type Errors = Partial<Record<keyof Values, MessageKey>>;

export function GroupFormDialog({ open, onClose, group }: Props) {
  const { t, lang } = useI18n();
  const save = useSaveGroup();
  const courses = useCourses();
  const rooms = useRooms();
  const teachers = useTeachers();
  const groupTeachers = useGroupTeacherLinks({ group_id: group?.id }, Boolean(group));

  const currentLink = activeLinks(groupTeachers.data)[0];

  const [values, setValues] = useState<Values>({
    name: group?.name ?? '',
    description: group?.description ?? '',
    course_id: group ? String(group.course_id) : '',
    room_id: group ? String(group.room_id) : '',
    teacher_id: '',
    start_date: toDateInput(group?.start_date ?? ''),
    start_time: group?.start_time ?? '',
    max_student: group ? String(group.max_student) : '',
    week_day: group?.week_day ?? [],
    status: group?.status ?? 'active',
  });
  const [teacherTouched, setTeacherTouched] = useState(false);
  const [errors, setErrors] = useState<Errors>({});

  const teacherValue = teacherTouched ? values.teacher_id : String(currentLink?.teacher_id ?? '');
  const referenceDataLoaded = courses.isSuccess && rooms.isSuccess;
  const missingReferenceData = referenceDataLoaded && (!courses.data.length || !rooms.data.length);

  const set = <K extends keyof Values>(key: K, value: Values[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  function validate(): Errors {
    return compact<Errors>({
      name: required(values.name),
      course_id: required(values.course_id),
      room_id: required(values.room_id),
      start_date: required(values.start_date),
      start_time: required(values.start_time),
      max_student: required(values.max_student) ?? (Number(values.max_student) >= 1 ? undefined : 'form.minOne'),
      week_day: values.week_day.length ? undefined : 'form.weekDaysRequired',
    });
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length) return;

    save.mutate(
      {
        id: group?.id,
        input: {
          name: values.name.trim(),
          ...(values.description.trim() && { description: values.description.trim() }),
          course_id: Number(values.course_id),
          room_id: Number(values.room_id),
          start_date: values.start_date,
          start_time: values.start_time,
          max_student: Number(values.max_student),
          week_day: WEEK_DAYS.filter((day) => values.week_day.includes(day)),
          ...(group && { status: values.status }),
        },
        teacherId: teacherValue ? Number(teacherValue) : null,
        currentLink: currentLink && { id: currentLink.id, target: currentLink.teacher_id },
      },
      { onSuccess: onClose },
    );
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t(group ? 'form.groupEdit' : 'form.groupCreate')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" form="group-form" loading={save.isPending} disabled={missingReferenceData}>
            {t(save.isPending ? 'common.saving' : 'common.save')}
          </Button>
        </>
      }
    >
      <form id="group-form" className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit} noValidate>
        {missingReferenceData && (
          <div className="sm:col-span-2">
            <Alert>{t('form.needCoursesRooms')}</Alert>
          </div>
        )}
        {save.error && (
          <div className="sm:col-span-2">
            <Alert>{apiErrorMessage(save.error, t('error.unknown'))}</Alert>
          </div>
        )}
        <div className="sm:col-span-2">
          <TextField
            label={t('field.groupName')}
            value={values.name}
            onChange={(e) => set('name', e.target.value)}
            error={errors.name}
            autoComplete="off"
          />
        </div>
        <SelectField
          label={t('field.course')}
          value={values.course_id}
          onChange={(e) => set('course_id', e.target.value)}
          error={errors.course_id}
        >
          <option value="">{t('field.select')}</option>
          {courses.data?.map((course) => (
            <option key={course.id} value={course.id}>
              {course.name}
            </option>
          ))}
        </SelectField>
        <SelectField
          label={t('field.room')}
          value={values.room_id}
          onChange={(e) => set('room_id', e.target.value)}
          error={errors.room_id}
        >
          <option value="">{t('field.select')}</option>
          {rooms.data?.map((room) => (
            <option key={room.id} value={room.id}>
              {room.name} · {room.capacity}
            </option>
          ))}
        </SelectField>
        <SelectField
          label={t('field.teacher')}
          optional
          value={teacherValue}
          onChange={(e) => {
            setTeacherTouched(true);
            set('teacher_id', e.target.value);
          }}
        >
          <option value="">{t('field.none')}</option>
          {teachers.data
            ?.filter((teacher) => teacher.status === 'active' || teacher.id === currentLink?.teacher_id)
            .map((teacher) => (
              <option key={teacher.id} value={teacher.id}>
                {teacher.full_name}
              </option>
            ))}
        </SelectField>
        <TextField
          label={t('field.maxStudents')}
          type="number"
          min={1}
          inputMode="numeric"
          value={values.max_student}
          onChange={(e) => set('max_student', e.target.value)}
          error={errors.max_student}
        />
        <TextField
          label={t('field.startDate')}
          type="date"
          value={values.start_date}
          onChange={(e) => set('start_date', e.target.value)}
          error={errors.start_date}
        />
        <TextField
          label={t('field.startTime')}
          type="time"
          value={values.start_time}
          onChange={(e) => set('start_time', e.target.value)}
          error={errors.start_time}
        />
        <div className="sm:col-span-2">
          <FormLabel id="group-week-days" className="mb-1.5 block">
            {t('field.weekDays')}
          </FormLabel>
          <ToggleButtonGroup
            value={values.week_day}
            onChange={(_, days: WeekDay[]) => set('week_day', days)}
            aria-labelledby="group-week-days"
            size="small"
            className="flex-wrap"
          >
            {WEEK_DAYS.map((day, index) => (
              <ToggleButton key={day} value={day} sx={{ minWidth: 42 }}>
                {WEEK_DAY_SHORT[lang][index]}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
          {errors.week_day && <FormHelperText error>{t(errors.week_day)}</FormHelperText>}
        </div>
        {group && (
          <SelectField
            label={t('field.status')}
            value={values.status}
            onChange={(e) => set('status', e.target.value as GroupStatus)}
          >
            {(Object.keys(groupStatus) as GroupStatus[]).map((status) => (
              <option key={status} value={status}>
                {t(groupStatus[status].label)}
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
