'use client';

import { useState, type FormEvent } from 'react';
import { useI18n } from '../../../i18n/I18nProvider';
import type { MessageKey } from '../../../i18n/messages';
import { useAuth } from '../../auth/AuthProvider';
import { useSaveStaff, type Staff, type StaffInput, type StaffRole, type Status } from '../api';
import { resourceStatus } from '../status';
import { PhotoField } from './PhotoField';
import { Alert, Button, Dialog, SelectField, TextField, apiErrorMessage } from '../ui';
import { EMAIL_PATTERN, compact, normalizePhone, phoneError, required } from './validation';

type Props = { open: boolean; onClose: () => void; staff?: Staff };

type Errors = Partial<Record<keyof StaffInput, MessageKey>>;

const ROLES: StaffRole[] = ['ADMIN', 'SUPERADMIN'];

export function StaffFormDialog({ open, onClose, staff }: Props) {
  const { t } = useI18n();
  const { role: currentRole } = useAuth();
  const save = useSaveStaff();
  const canGrantSuperadmin = currentRole === 'SUPERADMIN';

  const [values, setValues] = useState<StaffInput>({
    first_name: staff?.first_name ?? '',
    last_name: staff?.last_name ?? '',
    phone: staff?.phone ?? '',
    email: staff?.email ?? '',
    address: staff?.address ?? '',
    photo: staff?.photo ?? '',
    role: staff?.role ?? 'ADMIN',
    password: '',
    status: staff?.status ?? 'active',
  });
  const [errors, setErrors] = useState<Errors>({});

  const set = <K extends keyof StaffInput>(key: K, value: StaffInput[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const password = values.password ?? '';
    const found = compact<Errors>({
      first_name: required(values.first_name),
      last_name: required(values.last_name),
      phone: phoneError(values.phone),
      email:
        required(values.email) ?? (EMAIL_PATTERN.test(values.email.trim()) ? undefined : 'validation.emailInvalid'),
      address: required(values.address),
      password: (!staff || password) && password.length < 6 ? 'validation.passwordMin' : undefined,
    });
    setErrors(found);
    if (Object.keys(found).length) return;

    const roleChanged = !staff || staff.role !== values.role;
    save.mutate(
      {
        id: staff?.id,
        input: {
          first_name: values.first_name.trim(),
          last_name: values.last_name.trim(),
          phone: normalizePhone(values.phone.trim()),
          email: values.email.trim(),
          address: values.address.trim(),
          ...((staff || values.photo) && { photo: values.photo ?? '' }),
          ...(roleChanged && { role: values.role }),
          ...(password && { password }),
          ...(staff && { status: values.status }),
        } as StaffInput,
      },
      { onSuccess: onClose },
    );
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t(staff ? 'form.staffEdit' : 'form.staffCreate')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" form="staff-form" loading={save.isPending}>
            {t(save.isPending ? 'common.saving' : 'common.save')}
          </Button>
        </>
      }
    >
      <form id="staff-form" className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit} noValidate>
        {save.error && (
          <div className="sm:col-span-2">
            <Alert>{apiErrorMessage(save.error, t('error.unknown'))}</Alert>
          </div>
        )}
        <div className="sm:col-span-2">
          <PhotoField
            name={`${values.first_name} ${values.last_name}`.trim()}
            value={values.photo ?? ''}
            onChange={(photo) => set('photo', photo)}
          />
        </div>
        <TextField
          label={t('field.firstName')}
          value={values.first_name}
          onChange={(e) => set('first_name', e.target.value)}
          error={errors.first_name}
          autoComplete="off"
        />
        <TextField
          label={t('field.lastName')}
          value={values.last_name}
          onChange={(e) => set('last_name', e.target.value)}
          error={errors.last_name}
          autoComplete="off"
        />
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
          label={t(staff ? 'field.newPassword' : 'field.password')}
          type="password"
          value={values.password}
          onChange={(e) => set('password', e.target.value)}
          error={errors.password}
          hint={staff ? t('form.passwordKeepHint') : undefined}
          autoComplete="new-password"
        />
        <TextField
          label={t('field.address')}
          value={values.address}
          onChange={(e) => set('address', e.target.value)}
          error={errors.address}
        />
        <SelectField
          label={t('field.role')}
          value={values.role}
          onChange={(e) => set('role', e.target.value as StaffRole)}
          hint={canGrantSuperadmin ? undefined : t('form.superadminOnly')}
        >
          {ROLES.map((role) => (
            <option
              key={role}
              value={role}
              disabled={role === 'SUPERADMIN' && !canGrantSuperadmin && staff?.role !== 'SUPERADMIN'}
            >
              {t(`role.${role}`)}
            </option>
          ))}
        </SelectField>
        {staff && (
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
      </form>
    </Dialog>
  );
}
