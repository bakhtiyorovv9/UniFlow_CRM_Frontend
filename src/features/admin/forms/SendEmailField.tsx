'use client';

import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormHelperText from '@mui/material/FormHelperText';
import { useEffect } from 'react';
import { useI18n } from '../../../i18n/I18nProvider';
import { useMailStatus } from '../api';

export function SendEmailField({
  checked,
  onChange,
  email,
  newPassword = false,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  email: string;
  newPassword?: boolean;
}) {
  const { t } = useI18n();
  const status = useMailStatus();
  const configured = status.data?.configured ?? true;

  useEffect(() => {
    if (!configured && checked) onChange(false);
  }, [configured, checked, onChange]);
  const connection = status.data?.configured ? status.data : null;
  const warn = !configured || (connection !== null && !connection.connected);

  const hint = !configured
    ? t('mail.notConfigured')
    : connection && !connection.connected
      ? t('mail.notConnected', { reason: connection.message ?? '—' })
      : email.trim()
        ? t('mail.hint', { email: email.trim() })
        : t('mail.hintNoEmail');

  return (
    <div className="rounded-xl border border-border px-3 py-2">
      <FormControlLabel
        control={
          <Checkbox
            checked={configured && checked}
            disabled={!configured}
            onChange={(event) => onChange(event.target.checked)}
          />
        }
        label={t(newPassword ? 'mail.sendNewPassword' : 'mail.sendCredentials')}
      />
      <FormHelperText sx={{ mt: 0, ml: 4 }} error={warn}>
        {hint}
      </FormHelperText>
    </div>
  );
}
