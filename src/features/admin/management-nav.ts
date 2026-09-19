import { BookOpen, DoorOpen, IdCard, Wallet } from 'lucide-react';
import type { MessageKey } from '../../i18n/messages';

export const MANAGEMENT_ITEMS: { to: string; label: MessageKey; icon: typeof BookOpen }[] = [
  { to: '/management/payments', label: 'nav.payments', icon: Wallet },
  { to: '/management/courses', label: 'nav.courses', icon: BookOpen },
  { to: '/management/rooms', label: 'nav.rooms', icon: DoorOpen },
  { to: '/management/staff', label: 'nav.staff', icon: IdCard },
];
