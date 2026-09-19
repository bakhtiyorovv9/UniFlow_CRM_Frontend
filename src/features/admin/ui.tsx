'use client';

import MuiAlert from '@mui/material/Alert';
import MuiAvatar from '@mui/material/Avatar';
import MuiButton from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import MuiDialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormLabel from '@mui/material/FormLabel';
import MuiIconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import LinearProgress from '@mui/material/LinearProgress';
import ListItemIcon from '@mui/material/ListItemIcon';
import Menu from '@mui/material/Menu';
import MuiMenuItem from '@mui/material/MenuItem';
import MuiPagination from '@mui/material/Pagination';
import Paper from '@mui/material/Paper';
import { alpha, useTheme } from '@mui/material/styles';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import MuiTextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import { isAxiosError } from 'axios';
import { EllipsisVertical, Search, X, type LucideIcon } from 'lucide-react';
import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEvent,
  type InputHTMLAttributes,
  type MouseEvent,
  type ReactNode,
  type SelectHTMLAttributes,
} from 'react';
import { useI18n } from '../../i18n/I18nProvider';
import type { MessageKey } from '../../i18n/messages';
import { photoUrl } from '../../lib/api';
import { initials } from '../../lib/format';
import { notify } from '../../lib/notify';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

const buttonVariants = {
  primary: { variant: 'contained', color: 'primary' },
  secondary: { variant: 'outlined', color: 'inherit' },
  danger: { variant: 'contained', color: 'error' },
  ghost: { variant: 'text', color: 'inherit' },
} as const;

type ButtonProps = {
  variant?: ButtonVariant;
  loading?: boolean;
  icon?: LucideIcon;
  className?: string;
  children?: ReactNode;
  disabled?: boolean;
  type?: 'button' | 'submit';
  form?: string;
  onClick?: () => void;
};

export function Button({
  variant = 'primary',
  loading = false,
  icon: Icon,
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <MuiButton
      {...buttonVariants[variant]}
      {...props}
      type={type}
      loading={loading}
      loadingPosition={Icon ? 'start' : 'center'}
      startIcon={Icon ? <Icon className="size-4" aria-hidden /> : undefined}
    >
      {children}
    </MuiButton>
  );
}

export function IconButton({
  label,
  icon: Icon,
  className,
  onClick,
  tooltip = true,
  ...aria
}: {
  label: string;
  icon: LucideIcon;
  className?: string;
  onClick?: () => void;
  tooltip?: boolean;
  'aria-controls'?: string;
  'aria-expanded'?: boolean;
}) {
  const button = (
    <MuiIconButton aria-label={label} size="small" className={className} onClick={onClick} {...aria}>
      <Icon className="size-4" aria-hidden />
    </MuiIconButton>
  );
  return tooltip ? <Tooltip title={label}>{button}</Tooltip> : button;
}

export function Card({ className = '', children }: { className?: string; children: ReactNode }) {
  return (
    <Paper component="section" variant="outlined" className={className}>
      {children}
    </Paper>
  );
}

export function CardHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <header className="flex min-h-13 items-center justify-between gap-3 border-b border-border px-4 py-2.5">
      <h2 className="text-sm font-bold">{title}</h2>
      {action}
    </header>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Avatar({
  name,
  tone = 'accent',
  photo,
  size = 28,
}: {
  name: string;
  tone?: 'accent' | 'neutral';
  photo?: string | null;
  size?: number;
}) {
  const theme = useTheme();
  return (
    <MuiAvatar
      aria-hidden
      src={photoUrl(photo)}
      slotProps={{ img: { alt: '' } }}
      sx={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.36),
        fontWeight: 700,
        ...(tone === 'accent'
          ? { bgcolor: alpha(theme.palette.primary.main, 0.16), color: theme.palette.accent }
          : { bgcolor: theme.palette.action.hover, color: 'text.primary', border: 1, borderColor: 'divider' }),
      }}
    >
      {initials(name)}
    </MuiAvatar>
  );
}

export type BadgeTone = 'success' | 'warning' | 'danger' | 'neutral';

export function Badge({ tone, children }: { tone: BadgeTone; children: ReactNode }) {
  const theme = useTheme();
  const color =
    tone === 'neutral' ? theme.palette.text.secondary : theme.palette[tone === 'danger' ? 'error' : tone].main;
  return (
    <Chip
      size="small"
      label={children}
      sx={{
        height: 22,
        fontSize: 12,
        fontWeight: 600,
        color,
        bgcolor: tone === 'neutral' ? theme.palette.action.hover : alpha(color, 0.14),
        '& .MuiChip-label': { px: 1 },
      }}
    />
  );
}

export function ProgressBar({
  value,
  tone = 'success',
  className = 'w-24',
}: {
  value: number | null;
  tone?: 'success' | 'accent';
  className?: string;
}) {
  return (
    <LinearProgress
      variant="determinate"
      aria-hidden
      value={Math.min(100, Math.max(0, value ?? 0))}
      color={tone === 'success' ? 'success' : 'primary'}
      className={className}
      sx={{ height: 6, borderRadius: 999, bgcolor: 'divider', '& .MuiLinearProgress-bar': { borderRadius: 999 } }}
    />
  );
}

export function FilterChips<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string; count?: number }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}) {
  const theme = useTheme();
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Chip
            key={option.value}
            clickable
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            variant="outlined"
            label={
              <>
                {option.label}
                {option.count !== undefined && (
                  <span className={`ml-1.5 text-xs ${active ? '' : 'text-muted'}`}>{option.count}</span>
                )}
              </>
            }
            sx={{
              height: 32,
              fontSize: 14,
              borderColor: active ? 'primary.main' : 'divider',
              color: active ? theme.palette.accent : 'text.primary',
              bgcolor: active ? alpha(theme.palette.primary.main, 0.14) : 'background.paper',
            }}
          />
        );
      })}
    </div>
  );
}

export function apiErrorMessage(error: unknown, fallback: string) {
  if (isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (Array.isArray(message)) return message.join(', ');
    if (typeof message === 'string') return message;
  }
  return fallback;
}

export function Alert({ children }: { children: ReactNode }) {
  return (
    <MuiAlert severity="error" variant="outlined" sx={{ py: 0.25, alignItems: 'center', borderRadius: 2 }}>
      {children}
    </MuiAlert>
  );
}

export function StateMessage({
  loading,
  error,
  empty,
  onRetry,
  emptyText,
}: {
  loading: boolean;
  error: boolean;
  empty: boolean;
  onRetry?: () => void;
  emptyText?: string;
}) {
  const { t } = useI18n();
  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 px-4 py-12 text-sm text-muted" role="status">
        <CircularProgress size={16} color="inherit" />
        {t('common.loading')}
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 px-4 py-12 text-sm text-muted">
        {t('table.error')}
        {onRetry && (
          <Button variant="secondary" onClick={onRetry}>
            {t('common.retry')}
          </Button>
        )}
      </div>
    );
  }
  if (empty) {
    return <p className="px-4 py-12 text-center text-sm text-muted">{emptyText ?? t('table.empty')}</p>;
  }
  return null;
}

function labelCells(table: HTMLTableElement) {
  const heads = [...table.querySelectorAll<HTMLTableCellElement>('thead th')].map((th) => {
    const visible = [...th.childNodes]
      .filter((node) => !(node instanceof HTMLElement && node.classList.contains('sr-only')))
      .map((node) => node.textContent ?? '')
      .join('')
      .trim();
    const aria = th.querySelector('[aria-label]')?.getAttribute('aria-label') ?? '';
    const srOnly = !visible && !aria && Boolean(th.querySelector('.sr-only'));
    return {
      label: visible || aria,
      kind: visible === '#' ? 'index' : srOnly ? 'actions' : 'data',
      primary: th.dataset.mobilePrimary === 'true',
    };
  });
  const marked = heads.findIndex((head) => head.primary);
  const primary = marked >= 0 ? marked : heads.findIndex((head) => head.kind === 'data');
  table.querySelectorAll<HTMLTableRowElement>('tbody tr').forEach((row) => {
    [...row.cells].forEach((cell, index) => {
      const head = heads[index];
      if (!head) return;
      const kind = index === primary ? 'primary' : head.kind;
      if (cell.dataset.label !== head.label) cell.dataset.label = head.label;
      if (cell.dataset.rt !== kind) cell.dataset.rt = kind;
    });
  });
}

export function DataTable({
  minWidth,
  stack = true,
  children,
}: {
  minWidth: number;
  stack?: boolean;
  children: ReactNode;
}) {
  const ref = useRef<HTMLTableElement>(null);

  useLayoutEffect(() => {
    const table = ref.current;
    if (!stack || !table) return;
    labelCells(table);
    const observer = new MutationObserver(() => labelCells(table));
    observer.observe(table, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [stack]);

  return (
    <TableContainer className={stack ? 'rt-stack' : undefined} sx={{ position: 'relative' }}>
      <Table ref={ref} size="small" sx={{ minWidth }}>
        {children}
      </Table>
    </TableContainer>
  );
}

export function THead({ children }: { children: ReactNode }) {
  return <TableHead>{children}</TableHead>;
}

export function TBody({ className, children }: { className?: string; children: ReactNode }) {
  return <TableBody className={className}>{children}</TableBody>;
}

export function Tr({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return (
    <TableRow
      hover
      onClick={
        onClick &&
        ((event: MouseEvent<HTMLTableRowElement>) => {
          if (!(event.target as HTMLElement).closest('a, button, [role=menu], [role=menuitem]')) onClick();
        })
      }
      sx={onClick ? { cursor: 'pointer' } : undefined}
    >
      {children}
    </TableRow>
  );
}

export function Th({
  className,
  mobilePrimary,
  children,
}: {
  className?: string;
  mobilePrimary?: boolean;
  children?: ReactNode;
}) {
  return (
    <TableCell
      component="th"
      scope="col"
      className={className}
      data-mobile-primary={mobilePrimary ? 'true' : undefined}
    >
      {children}
    </TableCell>
  );
}

export function Td({ className, title, children }: { className?: string; title?: string; children?: ReactNode }) {
  return (
    <TableCell className={className} title={title}>
      {children}
    </TableCell>
  );
}

export type MenuItem = { label: string; icon: LucideIcon; onSelect: () => void; danger?: boolean };

type TriggerProps = {
  onClick: (event: MouseEvent<HTMLElement>) => void;
  'aria-label': string;
  'aria-haspopup': 'menu';
  'aria-expanded': boolean;
  'aria-controls'?: string;
};

export function RowMenu({
  label,
  items,
  renderTrigger,
  align = 'right',
  header,
}: {
  label: string;
  items: MenuItem[];
  renderTrigger?: (props: TriggerProps) => ReactNode;
  align?: 'left' | 'right';
  header?: ReactNode;
}) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const menuId = useId();
  const open = Boolean(anchor);

  const triggerProps: TriggerProps = {
    onClick: (event) => setAnchor(open ? null : event.currentTarget),
    'aria-label': label,
    'aria-haspopup': 'menu',
    'aria-expanded': open,
    'aria-controls': open ? menuId : undefined,
  };

  return (
    <>
      {renderTrigger ? (
        renderTrigger(triggerProps)
      ) : (
        <MuiIconButton size="small" {...triggerProps}>
          <EllipsisVertical className="size-4" aria-hidden />
        </MuiIconButton>
      )}
      <Menu
        id={menuId}
        anchorEl={anchor}
        open={open}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: align }}
        transformOrigin={{ vertical: 'top', horizontal: align }}
      >
        {header}
        {items.map((item) => (
          <MuiMenuItem
            key={item.label}
            onClick={() => {
              setAnchor(null);
              item.onSelect();
            }}
            sx={item.danger ? { color: 'error.main' } : undefined}
          >
            <ListItemIcon>
              <item.icon className="size-4" aria-hidden />
            </ListItemIcon>
            {item.label}
          </MuiMenuItem>
        ))}
      </Menu>
    </>
  );
}

export function Dialog({
  open,
  onClose,
  title,
  children,
  footer,
  size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md';
}) {
  const { t } = useI18n();
  const titleId = useId();

  return (
    <MuiDialog open={open} onClose={onClose} fullWidth maxWidth={size === 'sm' ? 'xs' : 'sm'} aria-labelledby={titleId}>
      <DialogTitle id={titleId} className="flex items-center justify-between gap-3">
        {title}
        <IconButton label={t('common.close')} icon={X} onClick={onClose} tooltip={false} />
      </DialogTitle>
      <DialogContent dividers>{children}</DialogContent>
      {footer && <DialogActions>{footer}</DialogActions>}
    </MuiDialog>
  );
}

type ConfirmProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  pending: boolean;
  error: unknown;
};

export function ConfirmDialog({
  title,
  body,
  confirmLabel,
  variant = 'danger',
  open,
  onClose,
  onConfirm,
  pending,
  error,
}: ConfirmProps & { title: string; body: string; confirmLabel: string; variant?: 'danger' | 'primary' }) {
  const { t } = useI18n();
  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="sm"
      title={title}
      footer={
        <>
          <Button
            variant="secondary"
            onClick={() => {
              onClose();
              notify.info('notify.cancelled');
            }}
          >
            {t('common.cancel')}
          </Button>
          <Button variant={variant} loading={pending} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-muted">{body}</p>
        {error ? <Alert>{apiErrorMessage(error, t('error.unknown'))}</Alert> : null}
      </div>
    </Dialog>
  );
}

export function ConfirmDelete({ name, body, ...props }: ConfirmProps & { name: string; body?: string }) {
  const { t } = useI18n();
  return (
    <ConfirmDialog
      title={t('delete.title', { name })}
      body={body ?? t('delete.body')}
      confirmLabel={t('common.delete')}
      {...props}
    />
  );
}

type FieldProps = {
  label: string;
  error?: MessageKey;
  hint?: string;
  optional?: boolean;
};

function FieldLabel({ id, label, optional }: { id: string; label: string; optional?: boolean }) {
  const { t } = useI18n();
  return (
    <FormLabel htmlFor={id} className="mb-1.5 block">
      {label}
      {optional && <span className="ml-1 font-normal text-muted">({t('common.optional')})</span>}
    </FormLabel>
  );
}

export function TextField({
  label,
  error,
  hint,
  optional,
  value,
  onChange,
  type,
  placeholder,
  disabled,
  autoComplete,
  ...htmlInput
}: FieldProps & InputHTMLAttributes<HTMLInputElement>) {
  const { t } = useI18n();
  const id = useId();
  return (
    <div>
      <FieldLabel id={id} label={label} optional={optional} />
      <MuiTextField
        id={id}
        fullWidth
        size="small"
        value={value}
        onChange={onChange as (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void}
        type={type}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete={autoComplete}
        error={Boolean(error)}
        helperText={error ? t(error) : hint}
        slotProps={{ htmlInput }}
      />
    </div>
  );
}

export function SelectField({
  label,
  error,
  hint,
  optional,
  children,
  value,
  onChange,
  disabled,
}: FieldProps & SelectHTMLAttributes<HTMLSelectElement>) {
  const { t } = useI18n();
  const id = useId();
  return (
    <div>
      <FieldLabel id={id} label={label} optional={optional} />
      <MuiTextField
        id={id}
        select
        fullWidth
        size="small"
        value={value}
        onChange={onChange as unknown as (event: ChangeEvent<HTMLInputElement>) => void}
        disabled={disabled}
        error={Boolean(error)}
        helperText={error ? t(error) : hint}
        slotProps={{ select: { native: true } }}
      >
        {children}
      </MuiTextField>
    </div>
  );
}

export function Pagination({
  page,
  pageCount,
  onChange,
}: {
  page: number;
  pageCount: number;
  onChange: (page: number) => void;
}) {
  const { t } = useI18n();
  if (pageCount <= 1) return null;
  return (
    <MuiPagination
      aria-label={t('pagination.label')}
      page={page}
      count={pageCount}
      onChange={(_, next) => onChange(next)}
      shape="rounded"
      variant="outlined"
      size="small"
      getItemAriaLabel={(type, itemPage) =>
        type === 'previous' ? t('pagination.prev') : type === 'next' ? t('pagination.next') : String(itemPage)
      }
    />
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <MuiTextField
      type="search"
      size="small"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="w-full sm:w-60"
      slotProps={{
        htmlInput: { 'aria-label': placeholder },
        input: {
          startAdornment: (
            <InputAdornment position="start">
              <Search className="size-4 text-muted" aria-hidden />
            </InputAdornment>
          ),
        },
      }}
    />
  );
}
