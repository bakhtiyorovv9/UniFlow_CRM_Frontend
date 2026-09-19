import type { ReactNode } from 'react';
import { ManagementLayout } from '../../../features/admin/pages/ManagementPage';

export default function Layout({ children }: { children: ReactNode }) {
  return <ManagementLayout>{children}</ManagementLayout>;
}
