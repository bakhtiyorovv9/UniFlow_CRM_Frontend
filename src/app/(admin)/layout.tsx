import type { ReactNode } from 'react';
import { RoleShell } from '../../features/auth/RoleShell';
import { ProtectedGuard } from '../../features/auth/RouteGuards';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <ProtectedGuard>
      <RoleShell>{children}</RoleShell>
    </ProtectedGuard>
  );
}
