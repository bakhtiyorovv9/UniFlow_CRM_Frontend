'use client';

import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import FormHelperText from '@mui/material/FormHelperText';
import { CloudUpload, Paperclip } from 'lucide-react';
import { useRef, useState, type DragEvent } from 'react';
import { useUploadFile } from '../features/admin/group/groupApi';
import { apiErrorMessage } from '../features/admin/ui';
import { useI18n } from '../i18n/I18nProvider';

export type UploadedFile = { url: string; name: string };

const ACCEPT = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar,.png,.jpg,.jpeg,.webp';

export function FileDropzone({
  file,
  onChange,
  onUploadingChange,
}: {
  file: UploadedFile | null;
  onChange: (file: UploadedFile | null) => void;
  onUploadingChange?: (uploading: boolean) => void;
}) {
  const { t } = useI18n();
  const upload = useUploadFile();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function uploadFile(selected?: File) {
    if (!selected) return;
    onUploadingChange?.(true);
    upload.mutate(selected, { onSuccess: onChange, onSettled: () => onUploadingChange?.(false) });
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    uploadFile(event.dataTransfer.files?.[0]);
  }

  return (
    <div>
      {file ? (
        <Chip
          icon={<Paperclip className="size-4" aria-hidden />}
          label={file.name}
          onDelete={() => onChange(null)}
          variant="outlined"
          sx={{ maxWidth: '100%' }}
        />
      ) : (
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              inputRef.current?.click();
            }
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-8 text-center transition-colors focus-visible:outline-2 focus-visible:outline-primary ${
            dragging ? 'border-primary bg-accent-bg' : 'border-border hover:bg-surface-hover'
          }`}
        >
          {upload.isPending ? (
            <CircularProgress size={24} />
          ) : (
            <CloudUpload className="size-7 text-success" aria-hidden />
          )}
          <span className="text-sm font-semibold text-accent">{t('homeworkForm.dropzone')}</span>
          <span className="text-xs text-muted">{t('homeworkForm.fileFormats')}</span>
          <input
            ref={inputRef}
            type="file"
            hidden
            accept={ACCEPT}
            onChange={(event) => {
              uploadFile(event.target.files?.[0]);
              event.target.value = '';
            }}
          />
        </div>
      )}
      {upload.error ? <FormHelperText error>{apiErrorMessage(upload.error, t('error.unknown'))}</FormHelperText> : null}
    </div>
  );
}
