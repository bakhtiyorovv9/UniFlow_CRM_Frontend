'use client';

import MuiIconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Tooltip from '@mui/material/Tooltip';
import { Moon, Sun } from 'lucide-react';
import { useI18n } from '../i18n/I18nProvider';
import { LANGUAGES, type Language } from '../i18n/messages';
import { useTheme } from '../theme/ThemeProvider';

export function LanguageSelect() {
  const { lang, setLang, t } = useI18n();

  return (
    <Select
      size="small"
      value={lang}
      onChange={(event) => setLang(event.target.value as Language)}
      inputProps={{ 'aria-label': t('common.language') }}
      renderValue={(value) => value.toUpperCase()}
      sx={{ height: 32, fontSize: 12, fontWeight: 600, '& .MuiSelect-select': { py: 0.5, pl: 1.25 } }}
    >
      {LANGUAGES.map((code) => (
        <MenuItem key={code} value={code} sx={{ fontSize: 13, fontWeight: 600 }}>
          {code.toUpperCase()}
        </MenuItem>
      ))}
    </Select>
  );
}

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const { t } = useI18n();
  const Icon = theme === 'dark' ? Sun : Moon;

  return (
    <Tooltip title={t('common.toggleTheme')}>
      <MuiIconButton
        onClick={toggleTheme}
        aria-label={t('common.toggleTheme')}
        size="small"
        sx={{ width: 32, height: 32, border: 1, borderColor: 'divider' }}
      >
        <Icon className="size-4" aria-hidden />
      </MuiIconButton>
    </Tooltip>
  );
}
