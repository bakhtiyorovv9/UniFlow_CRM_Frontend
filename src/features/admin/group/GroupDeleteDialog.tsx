'use client';

import MuiAlert from '@mui/material/Alert';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useI18n } from '../../../i18n/I18nProvider';
import { Alert, Button, Dialog, TextField, apiErrorMessage } from '../ui';

export function GroupDeleteDialog({
  name,
  pending,
  error,
  onClose,
  onConfirm,
}: {
  name: string;
  pending: boolean;
  error: unknown;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const { t } = useI18n();
  const [typed, setTyped] = useState('');
  const matches = typed.trim() === name.trim();

  return (
    <Dialog
      open
      onClose={onClose}
      title={t('groupDelete.title', { name })}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button variant="danger" icon={Trash2} loading={pending} disabled={!matches} onClick={onConfirm}>
            {t('groupDelete.confirm')}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {error ? <Alert>{apiErrorMessage(error, t('error.unknown'))}</Alert> : null}
        <MuiAlert severity="error" variant="outlined" sx={{ borderRadius: 2 }}>
          <p className="font-semibold">{t('groupDelete.warning')}</p>
          <ul className="mt-2 list-disc space-y-0.5 pl-5">
            {t('groupDelete.items')
              .split(' · ')
              .map((item) => (
                <li key={item}>{item}</li>
              ))}
          </ul>
          <p className="mt-2 text-xs opacity-80">{t('groupDelete.payments')}</p>
        </MuiAlert>
        <TextField
          label={t('groupDelete.confirmLabel', { name })}
          value={typed}
          onChange={(event) => setTyped(event.target.value)}
          placeholder={name}
          autoComplete="off"
          autoFocus
        />
      </div>
    </Dialog>
  );
}
