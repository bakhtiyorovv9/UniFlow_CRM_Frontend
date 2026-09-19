import type { MessageKey } from '../../i18n/messages';
import type { GroupStatus, Status, StudentStatus } from './api';
import type { BadgeTone } from './ui';

type StatusMeta = { label: MessageKey; tone: BadgeTone };

export const teacherStatus: Record<Status, StatusMeta> = {
  active: { label: 'status.active', tone: 'success' },
  freeze: { label: 'status.vacation', tone: 'warning' },
  inactive: { label: 'status.inactive', tone: 'neutral' },
};

export const studentStatus: Record<StudentStatus, StatusMeta> = {
  active: { label: 'status.active', tone: 'success' },
  freeze: { label: 'status.freeze', tone: 'warning' },
  inactive: { label: 'status.inactive', tone: 'danger' },
  graduated: { label: 'status.graduated', tone: 'neutral' },
};

export const groupStatus: Record<GroupStatus, StatusMeta> = {
  active: { label: 'status.active', tone: 'success' },
  planned: { label: 'status.planned', tone: 'warning' },
  completed: { label: 'status.completed', tone: 'neutral' },
  inactive: { label: 'status.inactive', tone: 'danger' },
};

export const resourceStatus: Record<Status, StatusMeta> = {
  active: { label: 'status.active', tone: 'success' },
  freeze: { label: 'status.freeze', tone: 'warning' },
  inactive: { label: 'status.inactive', tone: 'neutral' },
};
