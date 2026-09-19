'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { notify } from '../../lib/notify';
import { fetchAll, useInvalidate } from '../admin/api';
import { groupKeys, type HomeworkAnswer } from '../admin/group/groupApi';

export const useMyAnswers = () =>
  useQuery({
    queryKey: [...groupKeys.answers, 'mine'],
    queryFn: () => fetchAll<HomeworkAnswer>('/homework-answers'),
  });

export function useSubmitAnswer() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (body: { homework_id: number; title: string; file?: string }) =>
      (await api.post<{ late?: boolean }>('/homework-answers', body)).data,
    onSuccess: (data) => {
      if (data.late) notify.warning('notify.answerLate');
      else notify.success('notify.answerSent');
      return invalidate(groupKeys.answers);
    },
  });
}

export function latestAnswers(answers: HomeworkAnswer[] | undefined) {
  const map = new Map<number, HomeworkAnswer>();
  [...(answers ?? [])]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .forEach((answer) => {
      if (!map.has(answer.homework_id)) map.set(answer.homework_id, answer);
    });
  return map;
}
