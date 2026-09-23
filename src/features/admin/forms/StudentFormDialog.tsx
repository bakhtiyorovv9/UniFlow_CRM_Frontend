'use client';

import { useState, type FormEvent } from 'react';
import { useI18n } from '../../../i18n/I18nProvider';
import type { MessageKey } from '../../../i18n/messages';
import { toDateInput } from '../../../lib/format';
import {
  useGroups,
  useSaveStudent,
  useStudentGroupLinks,
  type Student,
  type StudentInput,
  type StudentStatus,
} from '../api';
import { activeLinks } from '../derive';
import { studentStatus } from '../status';
import { PhotoField } from './PhotoField';
import { SendEmailField } from './SendEmailField';
import { Alert, Button, Dialog, SelectField, TextField, apiErrorMessage } from '../ui';
import { EMAIL_PATTERN, compact, normalizePhone, phoneError, required } from './validation';

type Props = { open: boolean; onClose: () => void; student?: Student };

type Values = StudentInput & { group_id: string };
type Errors = Partial<Record<keyof Values, MessageKey>>;

export function StudentFormDialog({ open, onClose, student }: Props) {
  const { t } = useI18n();
  const save = useSaveStudent();
  const groups = useGroups();
  const studentGroups = useStudentGroupLinks({ student_id: student?.id }, Boolean(student));

  const currentLink = activeLinks(studentGroups.data)[0];

  const [sendEmail, setSendEmail] = useState(true);
  const [values, setValues] = useState<Values>({
    full_name: student?.full_name ?? '',
    phone: student?.phone ?? '',
    email: student?.email ?? '',
    address: student?.address ?? '',
    photo: student?.photo ?? '',
    birth_date: toDateInput(student?.birth_date ?? ''),
    password: '',
    status: student?.status ?? 'active',
    group_id: '',
  });
  const [groupTouched, setGroupTouched] = useState(false);
  const [errors, setErrors] = useState<Errors>({});

  const groupValue = groupTouched ? values.group_id : String(currentLink?.group_id ?? '');
  const selectableGroups = (groups.data ?? []).filter(
    (group) => group.status === 'active' || group.status === 'planned' || group.id === currentLink?.group_id,
  );

  const set = <K extends keyof Values>(key: K, value: Values[K]) => {
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
      birth_date: required(values.birth_date),
    };
    const password = values.password ?? '';
    if ((!student || password) && password.length < 6) result.password = 'validation.passwordMin';
    return compact(result);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length) return;

    const input: StudentInput = {
      full_name: values.full_name.trim(),
      phone: normalizePhone(values.phone.trim()),
      email: values.email.trim(),
      address: values.address.trim(),
      birth_date: values.birth_date,
      ...((student || values.photo) && { photo: values.photo ?? '' }),
      ...(values.password && { password: values.password }),
      ...(values.password && sendEmail && { send_email: true }),
      ...(student && { status: values.status }),
    };
    save.mutate(
      {
        id: student?.id,
        input,
        groupId: groupValue ? Number(groupValue) : null,
        currentLink: currentLink && { id: currentLink.id, target: currentLink.group_id },
      },
      { onSuccess: onClose },
    );
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t(student ? 'form.studentEdit' : 'form.studentCreate')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" form="student-form" loading={save.isPending}>
            {t(save.isPending ? 'common.saving' : 'common.save')}
          </Button>
        </>
      }
    >
      <form id="student-form" className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit} noValidate>
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
          label={t('field.birthDate')}
          type="date"
          value={values.birth_date}
          onChange={(e) => set('birth_date', e.target.value)}
          error={errors.birth_date}
        />
        <TextField
          label={t('field.address')}
          value={values.address}
          onChange={(e) => set('address', e.target.value)}
          error={errors.address}
        />
        <TextField
          label={t(student ? 'field.newPassword' : 'field.password')}
          type="password"
          value={values.password}
          onChange={(e) => set('password', e.target.value)}
          error={errors.password}
          hint={student ? t('form.passwordKeepHint') : undefined}
          autoComplete="new-password"
        />
        <SelectField
          label={t('field.group')}
          optional
          value={groupValue}
          onChange={(e) => {
            setGroupTouched(true);
            set('group_id', e.target.value);
          }}
        >
          <option value="">{t('field.none')}</option>
          {selectableGroups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </SelectField>
        {(!student || values.password) && (
          <div className="sm:col-span-2">
            <SendEmailField
              checked={sendEmail}
              onChange={setSendEmail}
              email={values.email}
              newPassword={Boolean(student)}
            />
          </div>
        )}
        {student && (
          <SelectField
            label={t('field.status')}
            value={values.status}
            onChange={(e) => set('status', e.target.value as StudentStatus)}
          >
            {(Object.keys(studentStatus) as StudentStatus[]).map((status) => (
              <option key={status} value={status}>
                {t(studentStatus[status].label)}
              </option>
            ))}
          </SelectField>
        )}
      </form>
    </Dialog>
  );
}
