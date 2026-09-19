import type { WeekDay } from '../features/admin/api';
import { addMonths } from './format';

const JS_DAY: Record<WeekDay, number> = {
  SUNDAY: 0,
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
};

export type StudyMonth = { index: number; start: Date; end: Date; dates: Date[] };

function atMidnight(value: string | Date) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function buildStudyMonths(startDate: string, durationMonths: number, weekDays: WeekDay[]): StudyMonth[] {
  const days = new Set(weekDays.map((day) => JS_DAY[day]));
  const start = atMidnight(startDate);
  const months: StudyMonth[] = [];

  for (let index = 0; index < Math.max(1, durationMonths); index++) {
    const monthStart = addMonths(start, index);
    const monthEnd = addMonths(start, index + 1);
    const dates: Date[] = [];
    for (const cursor = new Date(monthStart); cursor < monthEnd; cursor.setDate(cursor.getDate() + 1)) {
      if (days.has(cursor.getDay())) dates.push(new Date(cursor));
    }
    months.push({ index: index + 1, start: monthStart, end: new Date(monthEnd.getTime() - 1), dates });
  }
  return months;
}

export function lessonEndTime(startTime: string, totalHours: number, totalLessons: number) {
  if (!totalLessons || !totalHours) return null;
  const minutesPerLesson = Math.round((totalHours * 60) / totalLessons / 15) * 15;
  if (minutesPerLesson <= 0 || minutesPerLesson > 8 * 60) return null;
  const [hours, minutes] = startTime.split(':').map(Number);
  const end = hours * 60 + minutes + minutesPerLesson;
  return `${String(Math.floor(end / 60) % 24).padStart(2, '0')}:${String(end % 60).padStart(2, '0')}`;
}

export const HOMEWORK_WINDOW_MS = 24 * 60 * 60 * 1000;

export function homeworkDeadline(createdAt: string | Date) {
  return new Date(new Date(createdAt).getTime() + HOMEWORK_WINDOW_MS);
}

export function remainingParts(until: Date, now = new Date()) {
  const total = Math.max(0, Math.floor((until.getTime() - now.getTime()) / 60000));
  return { hours: Math.floor(total / 60), minutes: total % 60, total };
}
export function dayKey(date: Date | string) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function ageFrom(birthDate: string, now = new Date()) {
  const birth = new Date(birthDate);
  let age = now.getFullYear() - birth.getFullYear();
  if (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate()))
    age--;
  return age;
}
