import { percent } from '../../lib/format';
import type { Attendance } from './api';

export function activeLinks<T extends { status: string }>(links: T[] | undefined) {
  return (links ?? []).filter((link) => link.status === 'active');
}

export function attendanceRate(records: Attendance[]) {
  return percent(records.filter((record) => record.isPresent).length, records.length);
}
