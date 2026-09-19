'use client';

import { useState, type FormEvent } from 'react';
import { useI18n } from '../../../i18n/I18nProvider';
import type { MessageKey } from '../../../i18n/messages';
import { useSaveRoom, type Room, type Status } from '../api';
import { resourceStatus } from '../status';
import { Alert, Button, Dialog, SelectField, TextField, apiErrorMessage } from '../ui';
import { compact, required } from './validation';

type Props = { open: boolean; onClose: () => void; room?: Room };

type Values = { name: string; capacity: string; status: Status };

type Errors = Partial<Record<keyof Values, MessageKey>>;

export function RoomFormDialog({ open, onClose, room }: Props) {
  const { t } = useI18n();
  const save = useSaveRoom();
  const [values, setValues] = useState<Values>({
    name: room?.name ?? '',
    capacity: room ? String(room.capacity) : '',
    status: room?.status ?? 'active',
  });
  const [errors, setErrors] = useState<Errors>({});

  const set = <K extends keyof Values>(key: K, value: Values[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const capacity = Number(values.capacity);
    const found = compact<Errors>({
      name: required(values.name),
      capacity: required(values.capacity) ?? (Number.isInteger(capacity) && capacity >= 1 ? undefined : 'form.minOne'),
    });
    setErrors(found);
    if (Object.keys(found).length) return;

    save.mutate(
      {
        id: room?.id,
        input: { name: values.name.trim(), capacity, ...(room && { status: values.status }) },
      },
      { onSuccess: onClose },
    );
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="sm"
      title={t(room ? 'form.roomEdit' : 'form.roomCreate')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" form="room-form" loading={save.isPending}>
            {t(save.isPending ? 'common.saving' : 'common.save')}
          </Button>
        </>
      }
    >
      <form id="room-form" className="grid gap-4" onSubmit={handleSubmit} noValidate>
        {save.error && <Alert>{apiErrorMessage(save.error, t('error.unknown'))}</Alert>}
        <TextField
          label={t('field.roomName')}
          value={values.name}
          onChange={(e) => set('name', e.target.value)}
          error={errors.name}
          autoComplete="off"
        />
        <TextField
          label={t('field.capacity')}
          type="number"
          min={1}
          inputMode="numeric"
          value={values.capacity}
          onChange={(e) => set('capacity', e.target.value)}
          error={errors.capacity}
        />
        {room && (
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
