'use client';

import Autocomplete from '@mui/material/Autocomplete';
import FormHelperText from '@mui/material/FormHelperText';
import FormLabel from '@mui/material/FormLabel';
import MuiTextField from '@mui/material/TextField';
import { useMemo, useState, type FormEvent } from 'react';
import { useI18n } from '../../../i18n/I18nProvider';
import type { MessageKey } from '../../../i18n/messages';
import { useGroupTeacherLinks, useGroups, useSaveTeacher, type Status, type Teacher, type TeacherInput } from '../api';
import { teacherStatus } from '../status';
import { PhotoField } from './PhotoField';
import { SendEmailField } from './SendEmailField';
import { Alert, Button, Dialog, SelectField, TextField, apiErrorMessage } from '../ui';
import { EMAIL_PATTERN, compact, normalizePhone, phoneError, required } from './validation';

type Props = { open: boolean; onClose: () => void; teacher?: Teacher };

type Errors = Partial<Record<keyof TeacherInput, MessageKey>>;

export function TeacherFormDialog({ open, onClose, teacher }: Props) {
  const { t } = useI18n();
  const save = useSaveTeacher();
  const [sendEmail, setSendEmail] = useState(true);
  const [values, setValues] = useState<TeacherInput>({
    full_name: teacher?.full_name ?? '',
    phone: teacher?.phone ?? '',
    email: teacher?.email ?? '',
    address: teacher?.address ?? '',
    photo: teacher?.photo ?? '',
    password: '',
    status: teacher?.status ?? 'active',
  });
  const [errors, setErrors] = useState<Errors>({});

  const groups = useGroups();
  const groupTeachers = useGroupTeacherLinks({ teacher_id: teacher?.id }, Boolean(teacher));
  const links = useMemo(() => groupTeachers.data ?? [], [groupTeachers.data]);
  const [groupIds, setGroupIds] = useState<number[] | null>(null);
  const selectedIds = groupIds ?? links.filter((link) => link.status === 'active').map((link) => link.group_id);
  const groupOptions = (groups.data ?? []).filter(
    (group) => group.status === 'active' || group.status === 'planned' || selectedIds.includes(group.id),
  );

  const set = <K extends keyof TeacherInput>(key: K, value: TeacherInput[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  function validate(): Errors {
    const result: Errors = {
      full_name: required(values.full_name),
      phone: phoneError(values.phone),
      email:
        required(values.email) ?? (EMAIL_PATTERN.test(values.email.trim()) ? undefined : 'validation.emailInvalid'),
      address: required(values.address),
    };
    const password = values.password ?? '';
    if ((!teacher || password) && password.length < 6) result.password = 'validation.passwordMin';
    return compact(result);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length) return;

    const input: TeacherInput = {
      full_name: values.full_name.trim(),
      phone: normalizePhone(values.phone.trim()),
      email: values.email.trim(),
      address: values.address.trim(),
      ...((teacher || values.photo) && { photo: values.photo ?? '' }),
      ...(values.password && { password: values.password }),
      ...(values.password && sendEmail && { send_email: true }),
      ...(teacher && { status: values.status }),
    };
    save.mutate({ id: teacher?.id, input, groupIds: selectedIds, links }, { onSuccess: onClose });
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t(teacher ? 'form.teacherEdit' : 'form.teacherCreate')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" form="teacher-form" loading={save.isPending}>
            {t(save.isPending ? 'common.saving' : 'common.save')}
          </Button>
        </>
      }
    >
      <form id="teacher-form" className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit} noValidate>
        {save.error && (
          <div className="sm:col-span-2">
            <Alert>{apiErrorMessage(save.error, t('error.unknown'))}</Alert>
          </div>
        )}
        <div className="sm:col-span-2">
          <PhotoField name={values.full_name} value={values.photo ?? ''} onChange={(photo) => set('photo', photo)} />
        </div>
        <div className="sm:col-span-2">
          <TextField
            label={t('field.fullName')}
            value={values.full_name}
            onChange={(e) => set('full_name', e.target.value)}
            error={errors.full_name}
            autoComplete="off"
          />
        </div>
        <TextField
          label={t('field.phone')}
          type="tel"
          placeholder="+998901234567"
          value={values.phone}
          onChange={(e) => set('phone', e.target.value)}
          error={errors.phone}
        />
        <TextField
          label={t('field.email')}
          type="email"
          value={values.email}
          onChange={(e) => set('email', e.target.value)}
          error={errors.email}
          autoComplete="off"
        />
        <TextField
          label={t(teacher ? 'field.newPassword' : 'field.password')}
          type="password"
          value={values.password}
          onChange={(e) => set('password', e.target.value)}
          error={errors.password}
          hint={teacher ? t('form.passwordKeepHint') : undefined}
          autoComplete="new-password"
        />
        <TextField
          label={t('field.address')}
          value={values.address}
          onChange={(e) => set('address', e.target.value)}
          error={errors.address}
        />
        <div className="sm:col-span-2">
          <FormLabel htmlFor="teacher-groups" className="mb-1.5 block">
            {t('field.groups')}
            <span className="ml-1 font-normal text-muted">({t('common.optional')})</span>
          </FormLabel>
          <Autocomplete
            id="teacher-groups"
            multiple
            size="small"
            options={groupOptions}
            loading={groups.isPending || (Boolean(teacher) && groupTeachers.isPending)}
            value={groupOptions.filter((group) => selectedIds.includes(group.id))}
            onChange={(_, selected) => setGroupIds(selected.map((group) => group.id))}
            getOptionLabel={(group) => group.name}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            renderOption={({ key, ...props }, group) => (
              <li key={key} {...props}>
                <div className="flex w-full items-center justify-between gap-3">
                  <span className="font-medium">{group.name}</span>
                  <span className="text-xs text-muted">
                    {group.courses.name} · {group.start_time}
                  </span>
                </div>
              </li>
            )}
            noOptionsText={t('search.empty')}
            loadingText={t('common.loading')}
            renderInput={(params) => (
              <MuiTextField {...params} placeholder={selectedIds.length ? undefined : t('field.groupsPlaceholder')} />
            )}
          />
          <FormHelperText>{t('field.groupsHint')}</FormHelperText>
        </div>
        {(!teacher || values.password) && (
          <div className="sm:col-span-2">
            <SendEmailField
              checked={sendEmail}
              onChange={setSendEmail}
              email={values.email}
              newPassword={Boolean(teacher)}
            />
          </div>
        )}
        {teacher && (
          <SelectField
            label={t('field.status')}
            value={values.status}
            onChange={(e) => set('status', e.target.value as Status)}
          >
            {(Object.keys(teacherStatus) as Status[]).map((status) => (
              <option key={status} value={status}>
                {t(teacherStatus[status].label)}
              </option>
            ))}
          </SelectField>
        )}
      </form>
    </Dialog>
  );
}
