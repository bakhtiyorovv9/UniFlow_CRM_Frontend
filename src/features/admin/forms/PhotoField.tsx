'use client';

import MuiAvatar from '@mui/material/Avatar';
import MuiButton from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import FormHelperText from '@mui/material/FormHelperText';
import FormLabel from '@mui/material/FormLabel';
import { useMutation } from '@tanstack/react-query';
import { ImagePlus, Trash2 } from 'lucide-react';
import { useState, type ChangeEvent } from 'react';
import { useI18n } from '../../../i18n/I18nProvider';
import { api, photoUrl } from '../../../lib/api';
import { initials } from '../../../lib/format';
import { notify } from '../../../lib/notify';
import { apiErrorMessage } from '../ui';

export function PhotoField({
  name,
  value,
  onChange,
}: {
  name: string;
  value: string;
  onChange: (photo: string) => void;
}) {
  const { t } = useI18n();
  const [error, setError] = useState<string | null>(null);

  const upload = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append('file', file);
      return (await api.post<{ url: string }>('/uploads/photo', form)).data.url;
    },
    onSuccess: (url) => {
      setError(null);
      onChange(url);
      notify.success('notify.photoUploaded');
    },
    onError: (uploadError) => setError(apiErrorMessage(uploadError, t('error.unknown'))),
  });

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) upload.mutate(file);
  }

  return (
    <div>
      <FormLabel className="mb-1.5 block">
        {t('field.photo')}
        <span className="ml-1 font-normal text-muted">({t('common.optional')})</span>
      </FormLabel>
      <div className="flex flex-wrap items-center gap-3">
        <MuiAvatar src={photoUrl(value)} sx={{ width: 56, height: 56, fontSize: 18, fontWeight: 700 }}>
          {name.trim() ? initials(name) : <ImagePlus className="size-5" aria-hidden />}
        </MuiAvatar>
        <MuiButton
          component="label"
          variant="outlined"
          color="inherit"
          size="small"
          disabled={upload.isPending}
          startIcon={
            upload.isPending ? (
              <CircularProgress size={14} color="inherit" />
            ) : (
              <ImagePlus className="size-4" aria-hidden />
            )
          }
        >
          {t(upload.isPending ? 'photo.uploading' : value ? 'photo.change' : 'photo.choose')}
          <input
            type="file"
            hidden
            accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
            onChange={handleFile}
          />
        </MuiButton>
        {value && (
          <MuiButton
            variant="text"
            color="error"
            size="small"
            startIcon={<Trash2 className="size-4" aria-hidden />}
            onClick={() => onChange('')}
          >
            {t('photo.remove')}
          </MuiButton>
        )}
      </div>
      <FormHelperText error={Boolean(error)}>{error ?? t('photo.formats')}</FormHelperText>
    </div>
  );
}
