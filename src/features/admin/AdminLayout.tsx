'use client';

import MuiAvatar from '@mui/material/Avatar';
import MuiButton from '@mui/material/Button';
import Collapse from '@mui/material/Collapse';
import Drawer from '@mui/material/Drawer';
import MuiIconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import useMediaQuery from '@mui/material/useMediaQuery';
import { alpha, useTheme, type Theme } from '@mui/material/styles';
import Tooltip from '@mui/material/Tooltip';
import {
  BookOpen,
  ChartColumn,
  CircleUser,
  ChevronDown,
  ChevronRight,
  DoorOpen,
  GraduationCap,
  House,
  IdCard,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  Settings,
  User,
  Users,
  UsersRound,
  Wallet,
  X,
} from 'lucide-react';
import NextLink from 'next/link';
import { LogoMark } from '../../components/Logo';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode, type Ref } from 'react';
import { LanguageSelect, ThemeToggle } from '../../components/HeaderControls';
import { useI18n } from '../../i18n/I18nProvider';
import type { MessageKey } from '../../i18n/messages';
import { initials } from '../../lib/format';
import { readLocal, writeLocal } from '../../lib/storage';
import { displayName } from '../auth/auth.api';
import { useAuth } from '../auth/AuthProvider';
import { AdminDialogsProvider, useAdminDialogs } from './AdminDialogs';
import { GlobalSearch } from './GlobalSearch';
import { MANAGEMENT_ITEMS } from './management-nav';
import { ConfirmDialog, IconButton, RowMenu } from './ui';

const COLLAPSED_KEY = 'uniflow-sidebar-collapsed';
const MANAGEMENT_MENU_ID = 'management-menu';
const SIDEBAR_WIDTH = 224;
const RAIL_WIDTH = 64;

const NAV: { to: string; label: MessageKey; icon: typeof House }[] = [
  { to: '/', label: 'nav.dashboard', icon: House },
  { to: '/teachers', label: 'nav.teachers', icon: User },
  { to: '/groups', label: 'nav.groups', icon: Users },
  { to: '/students', label: 'nav.students', icon: GraduationCap },
];

type LayoutVariant = 'admin' | 'teacher' | 'student';

type NavEntry = { href: string; label: MessageKey; icon: typeof House; selected: boolean };

function useNavEntries(variant: LayoutVariant): NavEntry[] {
  const pathname = usePathname();
  const status = useSearchParams().get('status');
  if (variant === 'student') {
    return [
      { href: '/groups', label: 'nav.myGroups', icon: Users, selected: pathname.startsWith('/groups') },
      { href: '/results', label: 'nav.myResults', icon: ChartColumn, selected: pathname === '/results' },
      { href: '/profile', label: 'nav.profile', icon: CircleUser, selected: pathname === '/profile' },
    ];
  }
  if (variant === 'teacher') {
    const inGroups = pathname.startsWith('/groups');
    return [
      { href: '/groups', label: 'nav.groups', icon: Users, selected: inGroups && status !== 'planned' },
      {
        href: '/groups?status=planned',
        label: 'nav.plannedGroups',
        icon: UsersRound,
        selected: pathname === '/groups' && status === 'planned',
      },
      { href: '/profile', label: 'nav.profile', icon: CircleUser, selected: pathname === '/profile' },
    ];
  }
  return NAV.map((item) => ({
    href: item.to,
    label: item.label,
    icon: item.icon,
    selected: isActivePath(pathname, item.to),
  }));
}

function isActivePath(pathname: string, to: string) {
  return to === '/' ? pathname === '/' : pathname === to || pathname.startsWith(`${to}/`);
}

function NavItem({
  icon: Icon,
  label,
  selected,
  collapsed,
  href,
  onClick,
  endIcon,
  buttonRef,
  ...aria
}: {
  icon: typeof House;
  label: string;
  selected: boolean;
  collapsed: boolean;
  href?: string;
  onClick?: () => void;
  endIcon?: ReactNode;
  buttonRef?: Ref<HTMLDivElement>;
  'aria-expanded'?: boolean;
  'aria-controls'?: string;
}) {
  const theme = useTheme();
  const item = (
    <ListItemButton
      ref={buttonRef}
      {...(href ? { component: NextLink, href, 'aria-current': selected ? 'page' : undefined } : {})}
      selected={selected}
      onClick={onClick}
      {...aria}
      sx={{
        borderRadius: 2,
        minHeight: 38,
        px: collapsed ? 0 : 1.5,
        justifyContent: collapsed ? 'center' : 'flex-start',
        gap: 1.25,
        color: 'text.primary',
        '&.Mui-selected, &.Mui-selected:hover': {
          bgcolor: alpha(theme.palette.primary.main, 0.14),
          color: theme.palette.accent,
        },
      }}
    >
      <ListItemIcon>
        <Icon className="size-4" aria-hidden />
      </ListItemIcon>
      {collapsed ? (
        <span className="sr-only">{label}</span>
      ) : (
        <ListItemText
          primary={label}
          slotProps={{ primary: { noWrap: true, sx: { fontSize: 14, fontWeight: 600 } } }}
        />
      )}
      {!collapsed && endIcon}
    </ListItemButton>
  );

  return collapsed ? (
    <Tooltip title={label} placement="right">
      {item}
    </Tooltip>
  ) : (
    item
  );
}

type SidebarProps = {
  variant: 'rail' | 'drawer';
  entries: NavEntry[];
  showManagement: boolean;
  collapsed?: boolean;
  onNavigate?: () => void;
  managementOpen?: boolean;
  onManagementClick?: () => void;
  managementButtonRef?: Ref<HTMLDivElement>;
};

function Sidebar({
  variant,
  entries,
  showManagement,
  collapsed = false,
  onNavigate,
  managementOpen = false,
  onManagementClick,
  managementButtonRef,
}: SidebarProps) {
  const { t } = useI18n();
  const pathname = usePathname();
  const inManagement = pathname.startsWith('/management');
  const [drawerSectionOpen, setDrawerSectionOpen] = useState(inManagement);

  return (
    <div className="flex h-full flex-col">
      <div
        className={`flex h-[61px] shrink-0 items-center gap-2.5 border-b border-border ${collapsed ? 'justify-center' : 'px-4'}`}
      >
        <LogoMark size={34} label={collapsed ? 'UniFlow' : undefined} />
        {!collapsed && (
          <div className="min-w-0 leading-tight">
            <p className="text-sm font-bold">UniFlow</p>
            <p className="truncate text-[11px] text-muted">{t('brand.tagline')}</p>
          </div>
        )}
      </div>
      <List
        component="nav"
        aria-label="Main"
        className="flex-1 overflow-y-auto"
        sx={{ p: 1, display: 'grid', gap: 0.5, alignContent: 'start' }}
      >
        {entries.map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            icon={item.icon}
            label={t(item.label)}
            selected={item.selected}
            collapsed={collapsed}
            onClick={onNavigate}
          />
        ))}

        {!showManagement ? null : variant === 'rail' ? (
          <NavItem
            buttonRef={managementButtonRef}
            icon={Settings}
            label={t('nav.management')}
            selected={inManagement || managementOpen}
            collapsed={collapsed}
            onClick={onManagementClick}
            aria-expanded={managementOpen}
            aria-controls={MANAGEMENT_MENU_ID}
            endIcon={<ChevronRight className="size-4" aria-hidden />}
          />
        ) : (
          <>
            <NavItem
              icon={Settings}
              label={t('nav.management')}
              selected={inManagement}
              collapsed={false}
              onClick={() => setDrawerSectionOpen((open) => !open)}
              aria-expanded={drawerSectionOpen}
              aria-controls={`${MANAGEMENT_MENU_ID}-drawer`}
              endIcon={
                <ChevronDown
                  className={`size-4 transition-transform ${drawerSectionOpen ? 'rotate-180' : ''}`}
                  aria-hidden
                />
              }
            />
            <Collapse in={drawerSectionOpen} unmountOnExit>
              <List
                id={`${MANAGEMENT_MENU_ID}-drawer`}
                disablePadding
                sx={{ ml: 2, pl: 1, borderLeft: 1, borderColor: 'divider', display: 'grid', gap: 0.5 }}
              >
                {MANAGEMENT_ITEMS.map((item) => (
                  <NavItem
                    key={item.to}
                    href={item.to}
                    icon={item.icon}
                    label={t(item.label)}
                    selected={isActivePath(pathname, item.to)}
                    collapsed={false}
                    onClick={onNavigate}
                  />
                ))}
              </List>
            </Collapse>
          </>
        )}
      </List>
      <SidebarLogout collapsed={collapsed} />
    </div>
  );
}

function SidebarLogout({ collapsed }: { collapsed: boolean }) {
  const { t } = useI18n();
  const { logout } = useAuth();
  const theme = useTheme();
  const [confirming, setConfirming] = useState(false);
  const label = t('common.logout');

  const button = (
    <ListItemButton
      onClick={() => setConfirming(true)}
      sx={{
        borderRadius: 2,
        minHeight: 40,
        px: collapsed ? 0 : 1.5,
        justifyContent: collapsed ? 'center' : 'flex-start',
        gap: 1.25,
        color: 'error.main',
        border: 1,
        borderColor: alpha(theme.palette.error.main, 0.25),
        bgcolor: alpha(theme.palette.error.main, 0.06),
        '&:hover': {
          bgcolor: alpha(theme.palette.error.main, 0.14),
          borderColor: alpha(theme.palette.error.main, 0.45),
        },
      }}
    >
      <ListItemIcon sx={{ color: 'inherit' }}>
        <LogOut className="size-4" aria-hidden />
      </ListItemIcon>
      {collapsed ? (
        <span className="sr-only">{label}</span>
      ) : (
        <ListItemText
          primary={label}
          slotProps={{ primary: { noWrap: true, sx: { fontSize: 14, fontWeight: 600 } } }}
        />
      )}
    </ListItemButton>
  );

  return (
    <div className="shrink-0 border-t border-border p-2">
      {collapsed ? (
        <Tooltip title={label} placement="right">
          {button}
        </Tooltip>
      ) : (
        button
      )}
      <ConfirmDialog
        open={confirming}
        title={t('logout.confirmTitle')}
        body={t('logout.confirmBody')}
        confirmLabel={label}
        onClose={() => setConfirming(false)}
        onConfirm={() => {
          setConfirming(false);
          logout();
        }}
        pending={false}
        error={null}
      />
    </div>
  );
}

function ManagementFlyout({ open, collapsed, onClose }: { open: boolean; collapsed: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const pathname = usePathname();
  const offset = (collapsed ? RAIL_WIDTH : SIDEBAR_WIDTH) - 16;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      disableEnforceFocus
      sx={(theme) => ({ zIndex: theme.zIndex.drawer - 1, display: { xs: 'none', lg: 'block' } })}
      slotProps={{
        paper: {
          id: MANAGEMENT_MENU_ID,
          sx: { left: offset, width: 256, pl: 2, borderTopRightRadius: 16, borderBottomRightRadius: 16 },
        },
      }}
    >
      <div className="flex h-[61px] items-center border-b border-border px-4">
        <p className="text-base font-bold">{t('nav.menu')}</p>
      </div>
      <List component="nav" aria-label={t('nav.management')} sx={{ p: 1, display: 'grid', gap: 0.5 }}>
        {MANAGEMENT_ITEMS.map((item) => (
          <NavItem
            key={item.to}
            href={item.to}
            icon={item.icon}
            label={t(item.label)}
            selected={isActivePath(pathname, item.to)}
            collapsed={false}
            onClick={onClose}
          />
        ))}
      </List>
    </Drawer>
  );
}

function QuickAdd() {
  const { t } = useI18n();
  const compact = !useMediaQuery((theme: Theme) => theme.breakpoints.up('sm'));
  const {
    openTeacherForm,
    openGroupForm,
    openStudentForm,
    openCourseForm,
    openRoomForm,
    openStaffForm,
    openPaymentForm,
  } = useAdminDialogs();
  return (
    <RowMenu
      label={t('add.button')}
      align="left"
      renderTrigger={(props) => (
        <MuiButton
          variant="contained"
          {...props}
          sx={
            compact
              ? { minWidth: 0, width: 32, height: 32, minHeight: 32, p: 0, borderRadius: '10px' }
              : { minWidth: 0, px: 1.5 }
          }
          startIcon={compact ? undefined : <Plus className="size-4" aria-hidden />}
          endIcon={compact ? undefined : <ChevronDown className="size-3.5" aria-hidden />}
        >
          {compact ? <Plus className="size-[18px]" aria-hidden /> : t('add.button')}
        </MuiButton>
      )}
      items={[
        { label: t('add.payment'), icon: Wallet, onSelect: () => openPaymentForm() },
        { label: t('add.teacher'), icon: User, onSelect: () => openTeacherForm() },
        { label: t('add.group'), icon: Users, onSelect: () => openGroupForm() },
        { label: t('add.student'), icon: GraduationCap, onSelect: () => openStudentForm() },
        { label: t('add.course'), icon: BookOpen, onSelect: () => openCourseForm() },
        { label: t('add.room'), icon: DoorOpen, onSelect: () => openRoomForm() },
        { label: t('add.staff'), icon: IdCard, onSelect: () => openStaffForm() },
      ]}
    />
  );
}

function UserMenu() {
  const { t } = useI18n();
  const theme = useTheme();
  const router = useRouter();
  const { user, role, logout } = useAuth();
  if (!user) return null;
  const name = displayName(user);
  return (
    <RowMenu
      label={t('user.menu')}
      renderTrigger={(props) => (
        <MuiIconButton {...props} size="small" sx={{ p: 0.25 }}>
          <MuiAvatar
            sx={{
              width: 32,
              height: 32,
              fontSize: 12,
              fontWeight: 700,
              bgcolor: alpha(theme.palette.primary.main, 0.16),
              color: theme.palette.accent,
            }}
          >
            {initials(name).charAt(0)}
          </MuiAvatar>
        </MuiIconButton>
      )}
      header={
        <div className="mb-1 border-b border-border px-3.5 pt-1.5 pb-2.5">
          <p className="text-sm font-semibold">{name}</p>
          <p className="text-xs text-muted">{role ? t(`role.${role}`) : user.email}</p>
        </div>
      }
      items={[
        { label: t('nav.profile'), icon: CircleUser, onSelect: () => router.push('/profile') },
        { label: t('common.logout'), icon: LogOut, onSelect: logout },
      ]}
    />
  );
}

export function AdminLayout({ children, variant = 'admin' }: { children: ReactNode; variant?: LayoutVariant }) {
  const { t } = useI18n();
  const [searchOpen, setSearchOpen] = useState(false);
  const [managementOpen, setManagementOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => readLocal(COLLAPSED_KEY) === '1');
  const managementButtonRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const entries = useNavEntries(variant);
  const isAdmin = variant === 'admin';

  useEffect(() => {
    setManagementOpen(false);
  }, [pathname]);

  function toggleCollapsed() {
    setCollapsed((current) => {
      writeLocal(COLLAPSED_KEY, current ? '0' : '1');
      return !current;
    });
  }

  return (
    <AdminDialogsProvider>
      <div className={`min-h-dvh transition-[padding] duration-200 ${collapsed ? 'lg:pl-16' : 'lg:pl-56'}`}>
        <Drawer
          variant="permanent"
          sx={{ display: { xs: 'none', lg: 'block' } }}
          slotProps={{
            paper: {
              id: 'admin-sidebar',
              sx: (theme) => ({
                width: collapsed ? RAIL_WIDTH : SIDEBAR_WIDTH,
                overflowX: 'hidden',
                borderTopRightRadius: 16,
                borderBottomRightRadius: 16,
                boxShadow: theme.shadows[1],
                transition: theme.transitions.create('width', { duration: 200 }),
              }),
            },
          }}
        >
          <Sidebar
            variant="rail"
            entries={entries}
            showManagement={isAdmin}
            collapsed={collapsed}
            managementOpen={managementOpen}
            onManagementClick={() => setManagementOpen((open) => !open)}
            managementButtonRef={managementButtonRef}
          />
        </Drawer>

        <ManagementFlyout
          open={isAdmin && managementOpen}
          collapsed={collapsed}
          onClose={() => setManagementOpen(false)}
        />

        <header className="sticky top-0 z-30 flex h-[61px] items-center gap-2 border-b border-border bg-bg/90 px-3 backdrop-blur sm:gap-3 sm:px-5">
          <NextLink href={entries[0]?.href ?? '/'} className="shrink-0 lg:hidden" aria-label="UniFlow">
            <LogoMark size={32} />
          </NextLink>
          <div className="hidden shrink-0 lg:block">
            <IconButton
              label={t(collapsed ? 'nav.openMenu' : 'nav.closeMenu')}
              icon={collapsed ? PanelLeftOpen : PanelLeftClose}
              onClick={toggleCollapsed}
              aria-controls="admin-sidebar"
              aria-expanded={!collapsed}
            />
          </div>
          {isAdmin && (
            <div className="hidden min-w-0 flex-1 sm:block sm:max-w-md">
              <GlobalSearch />
            </div>
          )}
          {isAdmin && (
            <div className="sm:hidden">
              <IconButton
                label={t('search.placeholder')}
                icon={Search}
                onClick={() => setSearchOpen(true)}
                tooltip={false}
              />
            </div>
          )}
          {isAdmin && <QuickAdd />}
          {isAdmin && searchOpen && (
            <div className="absolute inset-0 z-20 flex items-center gap-2 bg-bg px-3 sm:hidden">
              <div className="min-w-0 flex-1">
                <GlobalSearch autoFocus onDone={() => setSearchOpen(false)} />
              </div>
              <IconButton label={t('common.close')} icon={X} onClick={() => setSearchOpen(false)} tooltip={false} />
            </div>
          )}
          <div className="ml-auto flex items-center gap-2">
            <LanguageSelect />
            <ThemeToggle />
            <UserMenu />
          </div>
        </header>

        <main className="px-4 pt-6 pb-28 sm:px-6 lg:pb-6">{children}</main>
        <BottomNav entries={entries} showManagement={isAdmin} />
      </div>
    </AdminDialogsProvider>
  );
}

function BottomNav({ entries, showManagement }: { entries: NavEntry[]; showManagement: boolean }) {
  const { t } = useI18n();
  const pathname = usePathname();
  const items = [
    ...entries,
    ...(showManagement
      ? [
          {
            href: '/management',
            label: 'nav.management' as MessageKey,
            icon: Settings,
            selected: pathname.startsWith('/management'),
          },
        ]
      : []),
  ];

  return (
    <nav
      aria-label={t('nav.bottom')}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 px-2 pt-1.5 shadow-[0_-8px_24px_rgba(0,0,0,0.12)] backdrop-blur lg:hidden"
      style={{ paddingBottom: 'max(6px, env(safe-area-inset-bottom))' }}
    >
      <ul className="mx-auto flex max-w-xl items-stretch justify-around gap-1">
        {items.map((item) => {
          const Icon = item.icon;
          const label = item.href === '/groups?status=planned' ? t('nav.plannedShort') : t(item.label);
          return (
            <li key={item.href} className="min-w-0 flex-1">
              <NextLink
                href={item.href}
                aria-current={item.selected ? 'page' : undefined}
                className={`group flex flex-col items-center gap-1 rounded-xl px-0.5 py-1.5 text-[10.5px] leading-tight font-semibold tracking-tight transition-colors focus-visible:outline-2 focus-visible:outline-primary ${
                  item.selected ? 'text-accent' : 'text-muted hover:text-fg'
                }`}
              >
                <span
                  className={`grid h-8 w-12 place-items-center rounded-full transition-all ${
                    item.selected ? 'bg-accent-bg scale-105' : 'group-hover:bg-surface-hover'
                  }`}
                >
                  <Icon className="size-[19px]" strokeWidth={item.selected ? 2.4 : 2} aria-hidden />
                </span>
                <span className="w-full truncate text-center">{label}</span>
              </NextLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
