'use client';

import { isAxiosError } from 'axios';
import MuiAlert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormLabel from '@mui/material/FormLabel';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import TextField from '@mui/material/TextField';
import { Eye, EyeOff } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { LanguageSelect, ThemeToggle } from '../../components/HeaderControls';
import { Logo } from '../../components/Logo';
import { useI18n } from '../../i18n/I18nProvider';
import type { MessageKey } from '../../i18n/messages';
import { useAuth } from './AuthProvider';

type FieldErrors = Partial<Record<'login' | 'password', MessageKey>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidLogin(value: string) {
  if (value.includes('@')) return EMAIL_PATTERN.test(value);
  return /^[\d\s()+-]+$/.test(value) && value.replace(/\D/g, '').length >= 9;
}

function validate(identifier: string, password: string): FieldErrors {
  const errors: FieldErrors = {};
  const value = identifier.trim();
  if (!value) errors.login = 'validation.loginRequired';
  else if (!isValidLogin(value)) errors.login = 'validation.loginInvalid';
  if (password.length < 6) errors.password = 'validation.passwordMin';
  return errors;
}

function loginErrorKey(error: unknown): MessageKey {
  if (!isAxiosError(error)) return 'error.unknown';
  if (!error.response) return 'error.network';
  if (error.response.status === 401) return 'error.invalidCredentials';
  if (error.response.status === 403) return 'error.inactive';
  return 'error.unknown';
}

export function LoginPage() {
  const { t } = useI18n();
  const { login } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<MessageKey | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors = validate(identifier, password);
    setFieldErrors(errors);
    setFormError(null);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    try {
      await login({ login: identifier.trim(), password }, remember);
    } catch (error) {
      setFormError(loginErrorKey(error));
      setSubmitting(false);
    }
  }

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <BrandPanel />

      <main className="flex min-h-dvh flex-col">
        <header className="flex items-center justify-between gap-2 p-4 sm:p-6 lg:justify-end">
          <div className="lg:hidden">
            <Logo />
          </div>
          <div className="flex items-center gap-2">
            <LanguageSelect />
            <ThemeToggle />
          </div>
        </header>

        <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6">
          <div className="w-full max-w-[400px]">
            <h1 className="text-2xl font-bold tracking-tight">{t('login.title')}</h1>
            <p className="mt-2 text-sm text-muted">{t('login.subtitle')}</p>

            <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
              {formError && (
                <MuiAlert severity="error" variant="outlined" sx={{ borderRadius: 2, alignItems: 'center' }}>
                  {t(formError)}
                </MuiAlert>
              )}

              <div>
                <FormLabel htmlFor="login" className="mb-2 block">
                  {t('login.identifier')}
                </FormLabel>
                <TextField
                  id="login"
                  fullWidth
                  autoComplete="username"
                  placeholder={t('login.identifierPlaceholder')}
                  value={identifier}
                  disabled={submitting}
                  onChange={(event) => {
                    setIdentifier(event.target.value);
                    setFieldErrors((errors) => ({ ...errors, login: undefined }));
                  }}
                  error={Boolean(fieldErrors.login)}
                  helperText={fieldErrors.login && t(fieldErrors.login)}
                />
              </div>

              <div>
                <FormLabel htmlFor="password" className="mb-2 block">
                  {t('login.password')}
                </FormLabel>
                <TextField
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  fullWidth
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  disabled={submitting}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setFieldErrors((errors) => ({ ...errors, password: undefined }));
                  }}
                  error={Boolean(fieldErrors.password)}
                  helperText={fieldErrors.password && t(fieldErrors.password)}
                  slotProps={{
                    input: {
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            edge="end"
                            size="small"
                            onClick={() => setShowPassword((value) => !value)}
                            aria-label={t(showPassword ? 'login.hidePassword' : 'login.showPassword')}
                            aria-pressed={showPassword}
                          >
                            {showPassword ? (
                              <EyeOff className="size-4" aria-hidden />
                            ) : (
                              <Eye className="size-4" aria-hidden />
                            )}
                          </IconButton>
                        </InputAdornment>
                      ),
                    },
                  }}
                />
              </div>

              <FormControlLabel
                control={
                  <Checkbox size="small" checked={remember} onChange={(event) => setRemember(event.target.checked)} />
                }
                label={t('login.remember')}
                slotProps={{ typography: { sx: { fontSize: 14 } } }}
              />

              <Button
                type="submit"
                variant="contained"
                fullWidth
                size="large"
                loading={submitting}
                loadingPosition="start"
              >
                {t(submitting ? 'login.submitting' : 'login.submit')}
              </Button>
            </form>
          </div>
        </div>

        <footer className="px-4 pb-6 text-xs text-muted sm:px-10">© {new Date().getFullYear()} UniFlow</footer>
      </main>
    </div>
  );
}

function BrandPanel() {
  const { t } = useI18n();

  return (
    <aside className="relative hidden overflow-hidden bg-[#177c86] p-10 text-white lg:flex lg:flex-col">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(255,255,255,0.2),transparent_55%),linear-gradient(170deg,transparent_40%,rgba(8,60,66,0.35))]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute top-[56%] left-[42%] h-full w-full rounded-tl-[88px] bg-white/10"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute top-[62%] left-[50%] h-full w-full rounded-tl-[64px] bg-[linear-gradient(160deg,#1a7880,#125c64)]"
        aria-hidden
      />

      <div className="relative">
        <Logo inverted />
      </div>

      <div className="relative flex flex-1 items-center pb-24">
        <div className="max-w-[500px]">
          <h2 className="text-4xl leading-tight font-extrabold tracking-tight text-balance">{t('brand.title')}</h2>
          <p className="mt-5 text-sm leading-relaxed text-white/85">
            {t('brand.subtitle')}
            <br />
            {t('brand.roles')}
          </p>
        </div>
      </div>
    </aside>
  );
}
