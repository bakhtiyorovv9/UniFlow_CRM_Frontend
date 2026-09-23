'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { MessageKey } from '../../i18n/messages';
import { api } from '../../lib/api';
import { formatMoney } from '../../lib/format';
import { notify } from '../../lib/notify';

export type Status = 'active' | 'inactive' | 'freeze';
export type StudentStatus = Status | 'graduated';
export type GroupStatus = 'planned' | 'active' | 'completed' | 'inactive';
export type WeekDay = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';

export const WEEK_DAYS: WeekDay[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

type Paginated<T> = { items: T[]; total: number; page: number; limit: number };

export type Teacher = {
  id: number;
  full_name: string;
  phone: string;
  email: string;
  address: string;
  photo: string | null;
  status: Status;
  created_at: string;
  archived_at: string | null;
};

export type AttendanceTally = { present: number; total: number };

export type TeacherRow = Teacher & {
  groups_count: number;
  students_count: number;
  courses: string[];
  attendance: AttendanceTally;
};

export type TeacherCounts = { all: number; active: number; inactive: number; freeze: number; archived: number };

export type StudentGroupLink = { id: number; group_id: number; groups: { id: number; name: string } };

export type Student = Omit<Teacher, 'status'> & {
  birth_date: string;
  status: StudentStatus;
  studentGroups?: StudentGroupLink[];
  attendance?: AttendanceTally;
};

export type StudentCounts = {
  all: number;
  active: number;
  inactive: number;
  freeze: number;
  graduated: number;
  archived: number;
  new_this_month: number;
};

export type AttendanceSummary = { by: 'group' | 'student'; items: { id: number; present: number; total: number }[] };

export type Course = {
  id: number;
  name: string;
  description: string | null;
  price: string | number;
  duration_month: number;
  duration_hours: number;
  status: Status;
  created_at: string;
  _count?: { groups: number };
};

export type Room = {
  id: number;
  name: string;
  capacity: number;
  status: Status;
  created_at: string;
  _count?: { groups: number };
};

export type StaffRole = 'SUPERADMIN' | 'ADMIN' | 'TEACHER' | 'STUDENT';

export type Payment = {
  id: number;
  student_id: number;
  group_id: number | null;
  user_id: number | null;
  amount: number;
  paid_at: string;
  note: string | null;
  created_at: string;
  students: { id: number; full_name: string; phone: string };
  groups: { id: number; name: string } | null;
  users: { id: number; first_name: string; last_name: string } | null;
};

export type Staff = {
  id: number;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  address: string;
  role: StaffRole;
  status: Status;
  photo: string | null;
  created_at: string;
};

export type Group = {
  id: number;
  name: string;
  description: string | null;
  course_id: number;
  room_id: number;
  start_date: string;
  start_time: string;
  max_student: number;
  status: GroupStatus;
  week_day: WeekDay[];
  created_at: string;
  courses: { id: number; name: string; duration_month: number };
  rooms: { id: number; name: string };
  _count?: { studentGroups: number };
  GroupTeacher?: {
    id: number;
    status: GroupStatus;
    Teacher: { id: number; full_name: string; photo: string | null };
  }[];
};

export type GroupTeacher = {
  id: number;
  group_id: number;
  teacher_id: number;
  status: GroupStatus;
  Teacher: Teacher;
  Group: Group;
};

export type StudentGroup = {
  id: number;
  student_id: number;
  group_id: number;
  status: Status;
  created_at: string;
  students: Student;
  groups: Group;
};

export type Attendance = {
  id: number;
  group_id: number;
  student_id: number;
  teacher_id: number | null;
  isPresent: boolean;
  created_at: string;
};

export type Lesson = {
  id: number;
  group_id: number;
  topic: string;
  description: string | null;
  created_at: string;
  groups: { id: number; name: string };
  teachers: { id: number; full_name: string } | null;
};

export type LessonVideo = {
  id: number;
  lesson_id: number;
  group_id: number;
  originalname: string;
  video_url: string;
  size_mb: number;
  created_at: string;
  lesson: { id: number; topic: string };
  groups: { id: number; name: string };
};

type Query = Record<string, string | number | undefined>;

const PAGE_SIZE = 500;

async function fetchPage<T>(path: string, params: Query) {
  const { data } = await api.get<Paginated<T>>(path, { params });
  return data;
}

export async function fetchAll<T>(path: string, params: Query = {}): Promise<T[]> {
  const items: T[] = [];
  for (let page = 1; ; page++) {
    const data = await fetchPage<T>(path, { ...params, page, limit: PAGE_SIZE });
    items.push(...data.items);
    if (items.length >= data.total || data.items.length === 0) return items;
  }
}

export const keys = {
  teachers: ['teachers'] as const,
  students: ['students'] as const,
  groups: ['groups'] as const,
  courses: ['courses'] as const,
  rooms: ['rooms'] as const,
  staff: ['staff'] as const,
  payments: ['payments'] as const,
  groupTeachers: ['group-teachers'] as const,
  studentGroups: ['student-groups'] as const,
  attendance: ['attendance'] as const,
  lessons: ['lessons'] as const,
  lessonVideos: ['lesson-videos'] as const,
};

const archivedParam = (archived: boolean) => (archived ? 'true' : undefined);

export const useTeachers = (archived = false, enabled = true) =>
  useQuery({
    queryKey: [...keys.teachers, archived ? 'archived' : 'current'],
    queryFn: () => fetchAll<Teacher>('/teachers', { archived: archivedParam(archived) }),
    enabled,
  });

export const useTeachersPage = (params: {
  page: number;
  limit: number;
  search?: string;
  status?: Status;
  archived?: boolean;
}) =>
  useQuery({
    queryKey: [...keys.teachers, 'page', params],
    queryFn: () => fetchPage<TeacherRow>('/teachers', { ...params, archived: archivedParam(Boolean(params.archived)) }),
    placeholderData: keepPreviousData,
  });

export const useTeacherCounts = () =>
  useQuery({
    queryKey: [...keys.teachers, 'counts'],
    queryFn: async () => (await api.get<TeacherCounts>('/teachers/counts')).data,
  });

export const useAllStudents = () =>
  useQuery({ queryKey: [...keys.students, 'all'], queryFn: () => fetchAll<Student>('/students') });

export const useStudentsPage = (params: {
  page: number;
  limit: number;
  search?: string;
  status?: StudentStatus;
  archived?: boolean;
}) =>
  useQuery({
    queryKey: [...keys.students, 'page', params],
    queryFn: () => fetchPage<Student>('/students', { ...params, archived: archivedParam(Boolean(params.archived)) }),
    placeholderData: keepPreviousData,
  });

export const useStudentCounts = () =>
  useQuery({
    queryKey: [...keys.students, 'counts'],
    queryFn: async () => (await api.get<StudentCounts>('/students/counts')).data,
  });

export const useGroups = () => useQuery({ queryKey: keys.groups, queryFn: () => fetchAll<Group>('/groups') });

export const useCourses = () => useQuery({ queryKey: keys.courses, queryFn: () => fetchAll<Course>('/courses') });

export const useRooms = () => useQuery({ queryKey: keys.rooms, queryFn: () => fetchAll<Room>('/rooms') });

export type PaymentsQuery = { page: number; limit: number; search?: string; from?: string; to?: string };

export const usePaymentsPage = (params: PaymentsQuery) =>
  useQuery({
    queryKey: [...keys.payments, 'page', params],
    queryFn: async () => (await api.get<Paginated<Payment> & { sum: number }>('/payments', { params })).data,
    placeholderData: keepPreviousData,
  });

export const usePaymentSum = (from: string, to: string) =>
  useQuery({
    queryKey: [...keys.payments, 'sum', from, to],
    queryFn: async () =>
      (await api.get<{ sum: number }>('/payments', { params: { from, to, page: 1, limit: 1 } })).data.sum,
  });

export const useStaff = () => useQuery({ queryKey: keys.staff, queryFn: () => fetchAll<Staff>('/users') });

export const useGroupTeacherLinks = (params: { group_id?: number; teacher_id?: number }, enabled = true) =>
  useQuery({
    queryKey: [...keys.groupTeachers, params],
    queryFn: () => fetchAll<GroupTeacher>('/group-teachers', params),
    enabled,
  });

export const useStudentGroupLinks = (params: { group_id?: number; student_id?: number }, enabled = true) =>
  useQuery({
    queryKey: [...keys.studentGroups, params],
    queryFn: () => fetchAll<StudentGroup>('/student-groups', params),
    enabled,
  });

export const useAttendanceSummary = (by: 'group' | 'student') =>
  useQuery({
    queryKey: [...keys.attendance, 'summary', by],
    queryFn: async () => (await api.get<AttendanceSummary>('/attendance/summary', { params: { by } })).data.items,
  });

export const useAttendanceRange = (from: string, to: string) =>
  useQuery({
    queryKey: [...keys.attendance, 'range', from, to],
    queryFn: () => fetchAll<Attendance>('/attendance', { from, to }),
  });


export const useRecentLessons = () =>
  useQuery({
    queryKey: [...keys.lessons, 'recent'],
    queryFn: async () => (await fetchPage<Lesson>('/lessons', { page: 1, limit: 100 })).items,
  });

export const useRecentVideos = (limit: number) =>
  useQuery({
    queryKey: [...keys.lessonVideos, 'recent', limit],
    queryFn: async () => (await api.get<LessonVideo[]>('/lesson-videos', { params: { limit } })).data,
  });

export type TeacherInput = {
  full_name: string;
  photo?: string;
  phone: string;
  email: string;
  address: string;
  password?: string;
  status?: Status;
  send_email?: boolean;
};

export type MailResult =
  { sent: true; to: string } | { sent: false; reason: 'not_configured' | 'provider_error'; message?: string };

export type MailStatus =
  | { configured: false }
  | { configured: true; connected: true }
  | { configured: true; connected: false; message?: string };

export const useMailStatus = (enabled = true) =>
  useQuery({
    queryKey: ['mail-status'],
    queryFn: async () => (await api.get<MailStatus>('/mail/status')).data,
    staleTime: 5 * 60 * 1000,
    enabled,
  });

function notifyMail(result?: MailResult) {
  if (!result) return;
  if (result.sent) notify.success('notify.emailSent');
  else if (result.reason === 'not_configured') notify.warning('notify.emailNotConfigured');
  else notify.warning('notify.emailFailed', { reason: result.message ?? 'SMTP' });
}

export type StudentInput = Omit<TeacherInput, 'status'> & {
  birth_date: string;
  status?: StudentStatus;
};

export type GroupInput = {
  name: string;
  description?: string;
  course_id: number;
  room_id: number;
  start_date: string;
  start_time: string;
  max_student: number;
  week_day: WeekDay[];
  status?: GroupStatus;
};

type LinkSync = {
  path: '/group-teachers' | '/student-groups';
  current?: { id: number; target: number };
  next: number | null;
  body: (target: number) => Record<string, number>;
};

async function syncLink({ path, current, next, body }: LinkSync) {
  if (current?.target === next) return;
  if (current) await api.delete(`${path}/${current.id}`);
  if (next) await api.post(path, body(next));
}

export function useInvalidate() {
  const client = useQueryClient();
  return (...queryKeys: (readonly string[])[]) =>
    Promise.all(queryKeys.map((queryKey) => client.invalidateQueries({ queryKey })));
}

export function useSaveTeacher() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({
      id,
      input,
      groupIds,
      links = [],
    }: {
      id?: number;
      input: TeacherInput;
      groupIds: number[];
      links?: Pick<GroupTeacher, 'id' | 'group_id' | 'status'>[];
    }) => {
      const { data } = id
        ? await api.patch<Teacher & { email_result?: MailResult }>(`/teachers/${id}`, input)
        : await api.post<Teacher & { email_result?: MailResult }>('/teachers', input);

      const selected = new Set(groupIds);
      await Promise.all([
        ...groupIds.map((group_id) => {
          const link = links.find((item) => item.group_id === group_id);
          if (!link) return api.post('/group-teachers', { group_id, teacher_id: data.id });
          if (link.status !== 'active') return api.patch(`/group-teachers/${link.id}`, { status: 'active' });
          return null;
        }),
        ...links
          .filter((link) => link.status === 'active' && !selected.has(link.group_id))
          .map((link) => api.delete(`/group-teachers/${link.id}`)),
      ]);
      return data.email_result;
    },
    onSuccess: (result, { id }) => {
      notify.success(id ? 'notify.teacherUpdated' : 'notify.teacherCreated');
      notifyMail(result);
      return invalidate(keys.teachers, keys.groupTeachers, keys.groups);
    },
  });
}

export function useSaveStudent() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({
      id,
      input,
      groupId,
      currentLink,
    }: {
      id?: number;
      input: StudentInput;
      groupId: number | null;
      currentLink?: { id: number; target: number };
    }) => {
      const { data } = id
        ? await api.patch<Student & { email_result?: MailResult }>(`/students/${id}`, input)
        : await api.post<Student & { email_result?: MailResult }>('/students', input);
      await syncLink({
        path: '/student-groups',
        current: currentLink,
        next: groupId,
        body: (group_id) => ({ student_id: data.id, group_id }),
      });
      return data.email_result;
    },
    onSuccess: (result, { id }) => {
      notify.success(id ? 'notify.studentUpdated' : 'notify.studentCreated');
      notifyMail(result);
      return invalidate(keys.students, keys.studentGroups);
    },
  });
}

export function useSaveGroup() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({
      id,
      input,
      teacherId,
      currentLink,
    }: {
      id?: number;
      input: GroupInput;
      teacherId: number | null;
      currentLink?: { id: number; target: number };
    }) => {
      const { data } = id ? await api.patch<Group>(`/groups/${id}`, input) : await api.post<Group>('/groups', input);
      await syncLink({
        path: '/group-teachers',
        current: currentLink,
        next: teacherId,
        body: (teacher_id) => ({ group_id: data.id, teacher_id }),
      });
    },
    onSuccess: (_, { id }) => {
      notify.success(id ? 'notify.groupUpdated' : 'notify.groupCreated');
      return invalidate(keys.groups, keys.groupTeachers, keys.studentGroups);
    },
  });
}

export function useArchiveAction(path: '/teachers' | '/students') {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, action }: { id: number; action: 'archive' | 'restore' }) => api.patch(`${path}/${id}/${action}`),
    onSuccess: (_, { action }) => {
      const who = path === '/teachers' ? 'teacher' : 'student';
      notify.success(`notify.${who}${action === 'archive' ? 'Archived' : 'Restored'}` as MessageKey);
      return invalidate(keys.teachers, keys.students, keys.groupTeachers, keys.studentGroups);
    },
  });
}

export type CourseInput = {
  name: string;
  description?: string;
  price: number;
  duration_month: number;
  duration_hours: number;
  status?: Status;
};

export type RoomInput = { name: string; capacity: number; status?: Status };

export type StaffInput = {
  first_name: string;
  photo?: string;
  last_name: string;
  phone: string;
  email: string;
  address: string;
  role: StaffRole;
  password?: string;
  status?: Status;
};

const RESOURCE_NOTICE = { '/courses': 'course', '/rooms': 'room', '/users': 'staff' } as const;

function useSaveResource<TInput>(path: '/courses' | '/rooms' | '/users', key: readonly string[]) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, input }: { id?: number; input: TInput }) =>
      id ? api.patch(`${path}/${id}`, input) : api.post(path, input),
    onSuccess: (_, { id }) => {
      notify.success(`notify.${RESOURCE_NOTICE[path]}${id ? 'Updated' : 'Created'}` as MessageKey);
      return invalidate(key, keys.groups);
    },
  });
}

export const useSaveCourse = () => useSaveResource<CourseInput>('/courses', keys.courses);
export const useSaveRoom = () => useSaveResource<RoomInput>('/rooms', keys.rooms);
export const useSaveStaff = () => useSaveResource<StaffInput>('/users', keys.staff);

export type PaymentInput = {
  student_id: number;
  group_id?: number;
  amount: number;
  paid_at?: string;
  note?: string;
};

export function useSavePayment() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, input }: { id?: number; input: PaymentInput }) =>
      id ? api.patch(`/payments/${id}`, input) : api.post('/payments', input),
    onSuccess: (_, { id, input }) => {
      if (id) notify.success('notify.paymentUpdated');
      else notify.success('notify.paymentCreated', { amount: formatMoney(input.amount, 'uz') });
      return invalidate(keys.payments);
    },
  });
}

export function useDeleteEntity(
  path: '/teachers' | '/students' | '/groups' | '/courses' | '/rooms' | '/users' | '/payments',
) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: number) => api.delete(`${path}/${id}`),
    onSuccess: () => {
      notify.success(DELETE_NOTICE[path]);
      return invalidate(
        keys.teachers,
        keys.students,
        keys.groups,
        keys.groupTeachers,
        keys.studentGroups,
        keys.courses,
        keys.rooms,
        keys.staff,
        keys.payments,
      );
    },
  });
}

const DELETE_NOTICE: Record<string, MessageKey> = {
  '/teachers': 'notify.teacherDeleted',
  '/students': 'notify.studentDeleted',
  '/groups': 'notify.groupDeleted',
  '/courses': 'notify.courseDeleted',
  '/rooms': 'notify.roomDeleted',
  '/users': 'notify.staffDeleted',
  '/payments': 'notify.paymentDeleted',
};
