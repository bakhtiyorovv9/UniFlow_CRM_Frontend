import { percent } from '../../lib/format';
import type { Attendance, GroupTeacher, StudentGroup } from './api';

function groupBy<T, K>(items: T[] | undefined, key: (item: T) => K) {
  const map = new Map<K, T[]>();
  for (const item of items ?? []) {
    const k = key(item);
    const bucket = map.get(k);
    if (bucket) bucket.push(item);
    else map.set(k, [item]);
  }
  return map;
}

export function activeLinks<T extends { status: string }>(links: T[] | undefined) {
  return (links ?? []).filter((link) => link.status === 'active');
}

export function studentLinksByGroup(links: StudentGroup[] | undefined) {
  return groupBy(activeLinks(links), (link) => link.group_id);
}

export function studentLinksByStudent(links: StudentGroup[] | undefined) {
  return groupBy(activeLinks(links), (link) => link.student_id);
}

export function teacherLinksByGroup(links: GroupTeacher[] | undefined) {
  return groupBy(activeLinks(links), (link) => link.group_id);
}

export function teacherLinksByTeacher(links: GroupTeacher[] | undefined) {
  return groupBy(activeLinks(links), (link) => link.teacher_id);
}

export function attendanceRate(records: Attendance[]) {
  return percent(records.filter((record) => record.isPresent).length, records.length);
}

export function attendanceBy(records: Attendance[] | undefined, key: 'group_id' | 'student_id') {
  return groupBy(records, (record) => record[key]);
}
