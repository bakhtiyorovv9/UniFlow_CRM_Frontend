'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import type { MessageKey } from '../../../i18n/messages';
import { api } from '../../../lib/api';
import { notify } from '../../../lib/notify';
import {
  fetchAll,
  keys,
  useInvalidate,
  type Attendance,
  type Course,
  type Group,
  type GroupTeacher,
  type Lesson,
  type LessonVideo,
  type Room,
  type StudentGroup,
} from '../api';

export type GroupDetail = Omit<Group, 'courses' | 'rooms'> & {
  courses: Course;
  rooms: Room;
  GroupTeacher: GroupTeacher[];
  studentGroups: StudentGroup[];
};

export type Homework = {
  id: number;
  group_id: number | null;
  lesson_id: number | null;
  title: string;
  file: string | null;
  created_at: string;
  lesson: { id: number; topic: string } | null;
};

export type HomeworkStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CHECKED';

export type HomeworkResultSummary = {
  id: number;
  grade: number;
  title: string;
  homeworkStatus: HomeworkStatus;
  update_at: string;
};

export type HomeworkAnswer = {
  id: number;
  homework_id: number;
  student_id: number;
  title: string;
  file: string | null;
  homeworkStatus: HomeworkStatus;
  created_at: string;
  students?: { id: number; full_name: string; photo?: string | null };
  homeworkResults?: HomeworkResultSummary[];
};

export type AttendanceRecord = Attendance & { students: { id: number; full_name: string } };

export type ExamResult = {
  id?: number;
  student_id: number;
  attended: boolean;
  score: number | null;
  comment: string | null;
  answer_text?: string | null;
  answer_file?: string | null;
  submitted_at?: string | null;
  students?: { id: number; full_name: string; photo?: string | null };
};

export type Exam = {
  id: number;
  group_id: number;
  title: string;
  description: string | null;
  exam_date: string;
  end_date: string | null;
  max_score: number;
  pass_score: number;
  created_at: string;
  groups?: { id: number; name: string; status?: string };
  teachers?: { id: number; full_name: string } | null;
  results: ExamResult[];
};

export type ExamInput = {
  title: string;
  description?: string;
  exam_date: string;
  end_date: string;
  max_score: number;
  pass_score: number;
};

export const examPassed = (exam: Pick<Exam, 'pass_score'>, result?: ExamResult) =>
  Boolean(result?.attended && result.score !== null && result.score >= exam.pass_score);

export const groupKeys = {
  detail: (id: number) => [...keys.groups, 'detail', id] as const,
  homeworks: ['homeworks'] as const,
  answers: ['homework-answers'] as const,
  exams: ['exams'] as const,
};

export const useExams = (groupId?: number) =>
  useQuery({
    queryKey: [...groupKeys.exams, 'list', groupId ?? 'all'],
    queryFn: async () => (await api.get<Exam[]>('/exams', { params: groupId ? { group_id: groupId } : {} })).data,
  });

export const useExam = (id: number) =>
  useQuery({
    queryKey: [...groupKeys.exams, 'detail', id],
    queryFn: async () => (await api.get<Exam>(`/exams/${id}`)).data,
  });

export function useSaveExam() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({ id, groupId, input }: { id?: number; groupId: number; input: ExamInput }) => {
      if (id) await api.patch(`/exams/${id}`, input);
      else await api.post('/exams', { group_id: groupId, ...input });
    },
    onSuccess: (_, { id }) => {
      notify.success(id ? 'notify.examUpdated' : 'notify.examCreated');
      return invalidate(groupKeys.exams);
    },
  });
}

export function useDeleteExam() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/exams/${id}`),
    onSuccess: () => {
      notify.success('notify.examDeleted');
      return invalidate(groupKeys.exams);
    },
  });
}

export function useSubmitExamAnswer() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, answer_text, answer_file }: { id: number; answer_text?: string; answer_file?: string }) =>
      api.post(`/exams/${id}/submit`, { answer_text, answer_file }),
    onSuccess: () => {
      notify.success('notify.examAnswerSent');
      return invalidate(groupKeys.exams);
    },
  });
}

export function useSaveExamResults(id: number) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (results: { student_id: number; attended: boolean; score?: number; comment?: string }[]) =>
      api.put(`/exams/${id}/results`, { results }),
    onSuccess: () => {
      notify.success('notify.examResultsSaved');
      return invalidate(groupKeys.exams);
    },
  });
}

export const useGroupDetail = (id: number) =>
  useQuery({
    queryKey: groupKeys.detail(id),
    queryFn: async () => (await api.get<GroupDetail>(`/groups/${id}`)).data,
  });

export const useGroupLessons = (groupId: number, enabled = true) =>
  useQuery({
    queryKey: [...keys.lessons, 'group', groupId],
    queryFn: () => fetchAll<Lesson>('/lessons', { group_id: groupId }),
    enabled,
  });

export const useGroupHomeworks = (groupId: number) =>
  useQuery({
    queryKey: [...groupKeys.homeworks, 'group', groupId],
    queryFn: () => fetchAll<Homework>('/homeworks', { group_id: groupId }),
  });

export const useGroupAnswers = (groupId: number) =>
  useQuery({
    queryKey: [...groupKeys.answers, 'group', groupId],
    queryFn: () => fetchAll<HomeworkAnswer>('/homework-answers', { group_id: groupId }),
  });

export const useHomework = (id: number) =>
  useQuery({
    queryKey: [...groupKeys.homeworks, 'detail', id],
    queryFn: async () => (await api.get<Homework>(`/homeworks/${id}`)).data,
  });

export const useAnswersForHomework = (homeworkId: number) =>
  useQuery({
    queryKey: [...groupKeys.answers, 'homework', homeworkId],
    queryFn: () => fetchAll<HomeworkAnswer>('/homework-answers', { homework_id: homeworkId }),
  });

export function useReviewAnswer() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (body: {
      homework_answer_id: number;
      grade: number;
      title: string;
      homeworkStatus: 'ACCEPTED' | 'REJECTED';
    }) => api.post('/homework-results', body),
    onSuccess: (_, body) => {
      notify.success(body.homeworkStatus === 'ACCEPTED' ? 'notify.answerAccepted' : 'notify.answerReturned');
      return invalidate(groupKeys.answers);
    },
  });
}

export const useGroupVideos = (groupId: number) =>
  useQuery({
    queryKey: [...keys.lessonVideos, 'group', groupId],
    queryFn: async () =>
      (await api.get<LessonVideo[]>('/lesson-videos', { params: { group_id: groupId } })).data,
  });

export const useGroupAttendance = (groupId: number, enabled = true) =>
  useQuery({
    queryKey: [...keys.attendance, 'group', groupId],
    queryFn: () => fetchAll<AttendanceRecord>('/attendance', { group_id: groupId }),
    enabled,
  });

export function useAddStudentToGroup() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (body: { student_id: number; group_id: number }) => api.post('/student-groups', body),
    onSuccess: () => {
      notify.success('notify.studentAddedToGroup');
      return invalidate(keys.groups, keys.studentGroups);
    },
  });
}

export function useAddStudentsToGroup() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({ groupId, studentIds }: { groupId: number; studentIds: number[] }) => {
      for (const student_id of studentIds) {
        await api.post('/student-groups', { student_id, group_id: groupId });
      }
      return studentIds.length;
    },
    onSuccess: (count) => {
      if (count === 1) notify.success('notify.studentAddedToGroup');
      else notify.success('notify.studentsAddedToGroup', { n: String(count) });
      return invalidate(keys.groups, keys.studentGroups);
    },
  });
}

export function useRemoveStudentLink() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (linkId: number) => api.delete(`/student-groups/${linkId}`),
    onSuccess: () => {
      notify.success('notify.studentRemovedFromGroup');
      return invalidate(keys.groups, keys.studentGroups);
    },
  });
}

export function useCreateLesson() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (body: { group_id: number; topic: string; description?: string }) => api.post('/lessons', body),
    onSuccess: () => {
      notify.success('notify.lessonCreated');
      return invalidate(keys.lessons);
    },
  });
}

export function useCreateHomework() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (body: { group_id: number; lesson_id: number; title: string; file?: string }) =>
      api.post('/homeworks', body),
    onSuccess: () => {
      notify.success('notify.homeworkCreated');
      return invalidate(groupKeys.homeworks);
    },
  });
}

export function useUploadVideo(onProgress: (percent: number) => void) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ lessonId, file }: { lessonId: number; file: File }) => {
      const form = new FormData();
      form.append('lesson_id', String(lessonId));
      form.append('file', file);
      return api.post('/lesson-videos', form, {
        onUploadProgress: (event) => event.total && onProgress(Math.round((event.loaded / event.total) * 100)),
      });
    },
    onSuccess: () => {
      notify.success('notify.videoUploaded');
      return invalidate(keys.lessonVideos);
    },
  });
}

const GROUP_ITEM_DELETED: Record<string, MessageKey> = {
  '/lessons': 'notify.lessonDeleted',
  '/homeworks': 'notify.homeworkDeleted',
  '/lesson-videos': 'notify.videoDeleted',
};

export function useDeleteGroupItem(path: '/lessons' | '/homeworks' | '/lesson-videos') {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: number) => api.delete(`${path}/${id}`),
    onSuccess: () => {
      notify.success(GROUP_ITEM_DELETED[path]);
      return invalidate(keys.lessons, groupKeys.homeworks, keys.lessonVideos);
    },
  });
}

export function useSaveAttendance() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({
      groupId,
      create,
      update,
    }: {
      groupId: number;
      create: { student_id: number; isPresent: boolean }[];
      update: { id: number; isPresent: boolean }[];
    }) => {
      if (create.length) await api.post('/attendance', { group_id: groupId, records: create });
      await Promise.all(update.map((record) => api.patch(`/attendance/${record.id}`, { isPresent: record.isPresent })));
    },
    onSuccess: () => {
      notify.success('notify.attendanceSaved');
      return invalidate(keys.attendance);
    },
  });
}

export function useSaveLessonDay() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({
      groupId,
      lessonId,
      topic,
      description,
      create,
      update,
    }: {
      groupId: number;
      lessonId?: number;
      topic: string;
      description: string;
      create: { student_id: number; isPresent: boolean }[];
      update: { id: number; isPresent: boolean }[];
    }) => {
      const lesson = { topic, ...(description ? { description } : {}) };
      if (lessonId) await api.patch(`/lessons/${lessonId}`, lesson);
      else await api.post('/lessons', { group_id: groupId, ...lesson });
      if (create.length) await api.post('/attendance', { group_id: groupId, records: create });
      await Promise.all(update.map((record) => api.patch(`/attendance/${record.id}`, { isPresent: record.isPresent })));
    },
    onSuccess: () => {
      notify.success('notify.lessonSaved');
      return invalidate(keys.lessons, keys.attendance);
    },
  });
}

export function useUploadFile() {
  return useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append('file', file);
      return (await api.post<{ url: string; name: string }>('/uploads/file', form)).data;
    },
    onSuccess: () => notify.success('notify.fileUploaded'),
  });
}
