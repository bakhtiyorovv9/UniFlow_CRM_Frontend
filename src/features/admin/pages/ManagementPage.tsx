'use client';

import { Pencil, Plus, Trash2, X } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import Tab from '@mui/material/Tab';
import MuiTextField from '@mui/material/TextField';
import Tabs from '@mui/material/Tabs';
import NextLink from 'next/link';
import { usePathname } from 'next/navigation';
import { useI18n } from '../../../i18n/I18nProvider';
import {
  dayBoundary,
  formatMoney,
  formatPhone,
  formatShortDate,
  formatTime,
  localDateInput,
} from '../../../lib/format';
import { useAuth } from '../../auth/AuthProvider';
import { useAdminDialogs } from '../AdminDialogs';
import { MANAGEMENT_ITEMS } from '../management-nav';
import {
  useCourses,
  useDeleteEntity,
  useGroups,
  usePaymentSum,
  usePaymentsPage,
  useRooms,
  useStaff,
  type Course,
  type Payment,
  type Room,
  type Staff,
} from '../api';
import { resourceStatus } from '../status';
import {
  Avatar,
  Badge,
  Button,
  Card,
  ConfirmDelete,
  ConfirmDialog,
  Pagination,
  RowMenu,
  SearchInput,
  StateMessage,
  DataTable,
  TBody,
  THead,
  Td,
  Th,
  Tr,
} from '../ui';
import { useClearUrlParams, useDebouncedUrlSearch, useUrlState } from '../useUrlState';

export function ManagementLayout({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const pathname = usePathname();
  const current = MANAGEMENT_ITEMS.find((tab) => pathname.startsWith(tab.to))?.to ?? false;
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('nav.management')}</h1>
        <Tabs
          value={current}
          aria-label={t('nav.management')}
          variant="scrollable"
          scrollButtons={false}
          className="mt-2"
        >
          {MANAGEMENT_ITEMS.map((tab) => (
            <Tab key={tab.to} value={tab.to} label={t(tab.label)} component={NextLink} href={tab.to} />
          ))}
        </Tabs>
      </div>
      {children}
    </div>
  );
}

function ResourceCard({
  title,
  subtitle,
  addLabel,
  onAdd,
  children,
}: {
  title: string;
  subtitle?: string | false;
  addLabel: string;
  onAdd: () => void;
  children: ReactNode;
}) {
  return (
    <Card className="overflow-hidden">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-4 sm:px-5">
        <div>
          <h2 className="text-base font-bold">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
        </div>
        <Button icon={Plus} onClick={onAdd}>
          {addLabel}
        </Button>
      </header>
      {children}
    </Card>
  );
}

function useDeleteState<T>(path: '/courses' | '/rooms' | '/users' | '/payments') {
  const [target, setTarget] = useState<T | null>(null);
  const remove = useDeleteEntity(path);
  return {
    target,
    remove,
    ask: (item: T) => {
      remove.reset();
      setTarget(item);
    },
    close: () => setTarget(null),
  };
}

export function CoursesTab() {
  const { t, lang } = useI18n();
  const { openCourseForm } = useAdminDialogs();
  const courses = useCourses();
  const groups = useGroups();
  const del = useDeleteState<Course>('/courses');

  const groupCount = useMemo(() => {
    const counts = new Map<number, number>();
    groups.data?.forEach((group) => counts.set(group.course_id, (counts.get(group.course_id) ?? 0) + 1));
    return counts;
  }, [groups.data]);

  const items = courses.data ?? [];

  return (
    <>
      <ResourceCard
        title={t('nav.courses')}
        subtitle={
          courses.data &&
          t('courses.summary', {
            total: String(items.length),
            active: String(items.filter((course) => course.status === 'active').length),
          })
        }
        addLabel={t('add.course')}
        onAdd={() => openCourseForm()}
      >
        <div className="overflow-x-auto">
          <DataTable minWidth={760}>
            <THead>
              <Tr>
                <Th>{t('col.course')}</Th>
                <Th>{t('col.price')}</Th>
                <Th>{t('col.duration')}</Th>
                <Th>{t('col.groups')}</Th>
                <Th>{t('col.status')}</Th>
                <Th className="w-12">
                  <span className="sr-only">{t('col.actions')}</span>
                </Th>
              </Tr>
            </THead>
            <TBody>
              {items.map((course) => {
                const status = resourceStatus[course.status];
                return (
                  <Tr key={course.id}>
                    <Td>
                      <p className="font-semibold">{course.name}</p>
                      {course.description && (
                        <p className="max-w-80 truncate text-xs text-muted">{course.description}</p>
                      )}
                    </Td>
                    <Td className="font-semibold whitespace-nowrap tabular-nums">
                      {t('course.price', { amount: formatMoney(course.price, lang) })}
                    </Td>
                    <Td className="whitespace-nowrap text-fg/85">
                      {t('course.duration', {
                        months: String(course.duration_month),
                        hours: String(course.duration_hours),
                      })}
                    </Td>
                    <Td className="font-semibold tabular-nums">{groupCount.get(course.id) ?? 0}</Td>
                    <Td>
                      <Badge tone={status.tone}>{t(status.label)}</Badge>
                    </Td>
                    <Td className="text-right">
                      <RowMenu
                        label={`${t('col.actions')}: ${course.name}`}
                        items={[
                          { label: t('common.edit'), icon: Pencil, onSelect: () => openCourseForm(course) },
                          { label: t('common.delete'), icon: Trash2, danger: true, onSelect: () => del.ask(course) },
                        ]}
                      />
                    </Td>
                  </Tr>
                );
              })}
            </TBody>
          </DataTable>
        </div>
        <StateMessage
          loading={courses.isPending}
          error={courses.isError}
          empty={items.length === 0}
          onRetry={() => courses.refetch()}
        />
      </ResourceCard>
      <ConfirmDelete
        open={Boolean(del.target)}
        name={del.target?.name ?? ''}
        onClose={del.close}
        onConfirm={() => del.target && del.remove.mutate(del.target.id, { onSuccess: del.close })}
        pending={del.remove.isPending}
        error={del.remove.error}
      />
    </>
  );
}

export function RoomsTab() {
  const { t } = useI18n();
  const { openRoomForm } = useAdminDialogs();
  const rooms = useRooms();
  const groups = useGroups();
  const del = useDeleteState<Room>('/rooms');

  const groupCount = useMemo(() => {
    const counts = new Map<number, number>();
    groups.data
      ?.filter((group) => group.status === 'active' || group.status === 'planned')
      .forEach((group) => counts.set(group.room_id, (counts.get(group.room_id) ?? 0) + 1));
    return counts;
  }, [groups.data]);

  const items = rooms.data ?? [];

  return (
    <>
      <ResourceCard
        title={t('nav.rooms')}
        subtitle={
          rooms.data &&
          t('rooms.summary', {
            total: String(items.length),
            capacity: String(items.reduce((sum, room) => sum + room.capacity, 0)),
          })
        }
        addLabel={t('add.room')}
        onAdd={() => openRoomForm()}
      >
        <div className="overflow-x-auto">
          <DataTable minWidth={560}>
            <THead>
              <Tr>
                <Th>{t('col.room')}</Th>
                <Th>{t('col.capacity')}</Th>
                <Th>{t('col.groups')}</Th>
                <Th>{t('col.status')}</Th>
                <Th className="w-12">
                  <span className="sr-only">{t('col.actions')}</span>
                </Th>
              </Tr>
            </THead>
            <TBody>
              {items.map((room) => {
                const status = resourceStatus[room.status];
                return (
                  <Tr key={room.id}>
                    <Td className="font-semibold">{room.name}</Td>
                    <Td className="text-fg/85">{t('room.capacity', { count: String(room.capacity) })}</Td>
                    <Td className="font-semibold tabular-nums">{groupCount.get(room.id) ?? 0}</Td>
                    <Td>
                      <Badge tone={status.tone}>{t(status.label)}</Badge>
                    </Td>
                    <Td className="text-right">
                      <RowMenu
                        label={`${t('col.actions')}: ${room.name}`}
                        items={[
                          { label: t('common.edit'), icon: Pencil, onSelect: () => openRoomForm(room) },
                          { label: t('common.delete'), icon: Trash2, danger: true, onSelect: () => del.ask(room) },
                        ]}
                      />
                    </Td>
                  </Tr>
                );
              })}
            </TBody>
          </DataTable>
        </div>
        <StateMessage
          loading={rooms.isPending}
          error={rooms.isError}
          empty={items.length === 0}
          onRetry={() => rooms.refetch()}
        />
      </ResourceCard>
      <ConfirmDelete
        open={Boolean(del.target)}
        name={del.target?.name ?? ''}
        onClose={del.close}
        onConfirm={() => del.target && del.remove.mutate(del.target.id, { onSuccess: del.close })}
        pending={del.remove.isPending}
        error={del.remove.error}
      />
    </>
  );
}

export function StaffTab() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { openStaffForm } = useAdminDialogs();
  const staff = useStaff();
  const del = useDeleteState<Staff>('/users');

  const currentUserId = user && 'first_name' in user ? user.id : null;
  const items = staff.data ?? [];
  const fullName = (member: Staff) => `${member.first_name} ${member.last_name}`;

  return (
    <>
      <ResourceCard
        title={t('nav.staff')}
        subtitle={staff.data && t('staff.summary', { total: String(items.length) })}
        addLabel={t('add.staff')}
        onAdd={() => openStaffForm()}
      >
        <div className="overflow-x-auto">
          <DataTable minWidth={760}>
            <THead>
              <Tr>
                <Th>{t('col.staff')}</Th>
                <Th>{t('col.phone')}</Th>
                <Th>{t('col.email')}</Th>
                <Th>{t('col.role')}</Th>
                <Th>{t('col.status')}</Th>
                <Th className="w-12">
                  <span className="sr-only">{t('col.actions')}</span>
                </Th>
              </Tr>
            </THead>
            <TBody>
              {items.map((member) => {
                const status = resourceStatus[member.status];
                const isSelf = member.id === currentUserId;
                return (
                  <Tr key={member.id}>
                    <Td>
                      <div className="flex items-center gap-2.5">
                        <Avatar name={fullName(member)} photo={member.photo} />
                        <span className="font-semibold">{fullName(member)}</span>
                        {isSelf && <Badge tone="neutral">{t('staff.you')}</Badge>}
                      </div>
                    </Td>
                    <Td className="whitespace-nowrap text-fg/85 tabular-nums">{formatPhone(member.phone)}</Td>
                    <Td className="text-fg/85">{member.email}</Td>
                    <Td>
                      <Badge tone={member.role === 'SUPERADMIN' ? 'warning' : 'neutral'}>
                        {t(`role.${member.role}`)}
                      </Badge>
                    </Td>
                    <Td>
                      <Badge tone={status.tone}>{t(status.label)}</Badge>
                    </Td>
                    <Td className="text-right">
                      <RowMenu
                        label={`${t('col.actions')}: ${fullName(member)}`}
                        items={[
                          { label: t('common.edit'), icon: Pencil, onSelect: () => openStaffForm(member) },
                          ...(isSelf
                            ? []
                            : [
                                {
                                  label: t('common.delete'),
                                  icon: Trash2,
                                  danger: true,
                                  onSelect: () => del.ask(member),
                                },
                              ]),
                        ]}
                      />
                    </Td>
                  </Tr>
                );
              })}
            </TBody>
          </DataTable>
        </div>
        <StateMessage
          loading={staff.isPending}
          error={staff.isError}
          empty={items.length === 0}
          onRetry={() => staff.refetch()}
        />
      </ResourceCard>
      <ConfirmDelete
        open={Boolean(del.target)}
        name={del.target ? fullName(del.target) : ''}
        onClose={del.close}
        onConfirm={() => del.target && del.remove.mutate(del.target.id, { onSuccess: del.close })}
        pending={del.remove.isPending}
        error={del.remove.error}
      />
    </>
  );
}

const PAYMENTS_PAGE_SIZE = 15;
const DATE_PARAMS = ['from', 'to'];

function SumTile({ label, value, lang }: { label: string; value: number | undefined; lang: 'uz' | 'ru' | 'en' }) {
  const { t } = useI18n();
  return (
    <Card className="px-4 py-3.5">
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className="mt-1.5 text-xl font-bold tracking-tight tabular-nums sm:text-2xl">
        {value === undefined ? '—' : t('course.price', { amount: formatMoney(value, lang) })}
      </p>
    </Card>
  );
}

export function PaymentsTab() {
  const { t, lang } = useI18n();
  const { openPaymentForm } = useAdminDialogs();
  const { query, input, setInput } = useDebouncedUrlSearch();
  const [from, setFrom] = useUrlState('from', '');
  const [to, setTo] = useUrlState('to', '');
  const [pageParam, setPageParam] = useUrlState('page', '1');
  const clearDates = useClearUrlParams(DATE_PARAMS);
  const [toDelete, setToDelete] = useState<Payment | null>(null);
  const remove = useDeleteEntity('/payments');

  const now = useMemo(() => new Date(), []);
  const today = localDateInput(now);
  const monthStart = localDateInput(new Date(now.getFullYear(), now.getMonth(), 1));
  const todaySum = usePaymentSum(dayBoundary(today, 'start'), dayBoundary(today, 'end')).data;
  const monthSum = usePaymentSum(dayBoundary(monthStart, 'start'), dayBoundary(today, 'end')).data;

  const page = Math.max(1, Number(pageParam) || 1);
  const payments = usePaymentsPage({
    page,
    limit: PAYMENTS_PAGE_SIZE,
    search: query || undefined,
    from: from ? dayBoundary(from, 'start') : undefined,
    to: to ? dayBoundary(to, 'end') : undefined,
  });

  const items = payments.data?.items ?? [];
  const total = payments.data?.total ?? 0;
  const firstIndex = total === 0 ? 0 : (page - 1) * PAYMENTS_PAGE_SIZE + 1;
  const filtered = Boolean(from || to || query);

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SumTile label={t('payments.today')} value={todaySum} lang={lang} />
        <SumTile label={t('payments.thisMonth')} value={monthSum} lang={lang} />
        <SumTile label={t(filtered ? 'payments.period' : 'payments.allTime')} value={payments.data?.sum} lang={lang} />
      </div>

      <ResourceCard
        title={t('nav.payments')}
        subtitle={payments.data && t('payments.count', { count: String(total) })}
        addLabel={t('add.payment')}
        onAdd={() => openPaymentForm()}
      >
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 pt-4 pb-3 sm:px-5">
          <SearchInput value={input} onChange={setInput} placeholder={t('payments.searchPlaceholder')} />
          <MuiTextField
            type="date"
            size="small"
            label={t('payments.from')}
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: to || today } }}
          />
          <MuiTextField
            type="date"
            size="small"
            label={t('payments.to')}
            value={to}
            onChange={(e) => setTo(e.target.value)}
            slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: from || undefined, max: today } }}
          />
          {(from || to) && (
            <Button variant="ghost" icon={X} onClick={clearDates}>
              {t('payments.clear')}
            </Button>
          )}
        </div>

        <div className="overflow-x-auto">
          <DataTable minWidth={860}>
            <THead>
              <Tr>
                <Th>{t('col.date')}</Th>
                <Th>{t('col.student')}</Th>
                <Th>{t('col.group')}</Th>
                <Th className="text-right">{t('col.amount')}</Th>
                <Th>{t('col.note')}</Th>
                <Th>{t('col.receivedBy')}</Th>
                <Th className="w-12">
                  <span className="sr-only">{t('col.actions')}</span>
                </Th>
              </Tr>
            </THead>
            <TBody className={`transition-opacity ${payments.isPlaceholderData ? 'opacity-60' : ''}`}>
              {items.map((payment) => {
                const paidAt = new Date(payment.paid_at);
                return (
                  <Tr key={payment.id}>
                    <Td className="whitespace-nowrap">
                      <p className="font-semibold">{formatShortDate(paidAt, lang, true)}</p>
                      <p className="text-xs text-muted tabular-nums">{formatTime(paidAt)}</p>
                    </Td>
                    <Td>
                      <div className="flex items-center gap-2.5">
                        <Avatar name={payment.students.full_name} tone="neutral" />
                        <div className="min-w-0">
                          <p className="truncate font-semibold">{payment.students.full_name}</p>
                          <p className="text-xs text-muted">{formatPhone(payment.students.phone)}</p>
                        </div>
                      </div>
                    </Td>
                    <Td className="text-fg/85">{payment.groups?.name ?? <span className="text-muted">—</span>}</Td>
                    <Td className="text-right font-bold whitespace-nowrap text-success tabular-nums">
                      +{t('course.price', { amount: formatMoney(payment.amount, lang) })}
                    </Td>
                    <Td className="max-w-56 truncate text-fg/85" title={payment.note ?? undefined}>
                      {payment.note ?? <span className="text-muted">—</span>}
                    </Td>
                    <Td className="whitespace-nowrap text-fg/85">
                      {payment.users ? `${payment.users.first_name} ${payment.users.last_name}` : '—'}
                    </Td>
                    <Td className="text-right">
                      <RowMenu
                        label={`${t('col.actions')}: ${payment.students.full_name}`}
                        items={[
                          { label: t('common.edit'), icon: Pencil, onSelect: () => openPaymentForm(payment) },
                          {
                            label: t('common.delete'),
                            icon: Trash2,
                            danger: true,
                            onSelect: () => {
                              remove.reset();
                              setToDelete(payment);
                            },
                          },
                        ]}
                      />
                    </Td>
                  </Tr>
                );
              })}
            </TBody>
          </DataTable>
        </div>
        <StateMessage
          loading={payments.isPending}
          error={payments.isError}
          empty={items.length === 0}
          emptyText={t('payments.empty')}
          onRetry={() => payments.refetch()}
        />
        {total > 0 && (
          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
            <p className="text-xs text-muted tabular-nums">
              {firstIndex}–{firstIndex + items.length - 1} / {total}
            </p>
            <Pagination
              page={page}
              pageCount={Math.ceil(total / PAYMENTS_PAGE_SIZE)}
              onChange={(next) => setPageParam(String(next))}
            />
          </footer>
        )}
      </ResourceCard>

      <ConfirmDialog
        open={Boolean(toDelete)}
        title={t('delete.paymentTitle', { amount: toDelete ? formatMoney(toDelete.amount, lang) : '' })}
        body={toDelete ? `${toDelete.students.full_name} · ${t('delete.body')}` : ''}
        confirmLabel={t('common.delete')}
        onClose={() => setToDelete(null)}
        onConfirm={() => toDelete && remove.mutate(toDelete.id, { onSuccess: () => setToDelete(null) })}
        pending={remove.isPending}
        error={remove.error}
      />
    </>
  );
}
