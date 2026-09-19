'use client';

import CircularProgress from '@mui/material/CircularProgress';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { AdminLayout } from '../admin/AdminLayout';
import { useAuth } from './AuthProvider';

const TEACHER_PATHS = ['/groups', '/profile'];
const STUDENT_PATHS = [/^\/groups$/, /^\/groups\/\d+$/, /^\/results$/, /^\/profile$/];

function allowedForTeacher(pathname: string) {
  return TEACHER_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function allowedForStudent(pathname: string) {
  return STUDENT_PATHS.some((pattern) => pattern.test(pathname));
}

export function RoleShell({ children }: { children: ReactNode }) {
  const { role } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const isTeacher = role === 'TEACHER';
  const redirectTeacher = isTeacher && !allowedForTeacher(pathname);
  const redirectStudent = role === 'STUDENT' && !allowedForStudent(pathname);

  useEffect(() => {
    if (redirectTeacher || redirectStudent) router.replace('/groups');
  }, [redirectTeacher, redirectStudent, router]);

  if (role === 'ADMIN' || role === 'SUPERADMIN') return <AdminLayout>{children}</AdminLayout>;
  if (redirectTeacher || redirectStudent || !role) {
    return (
      <div className="grid min-h-dvh place-items-center" role="status">
        <CircularProgress size={28} aria-hidden />
      </div>
    );
  }
  return <AdminLayout variant={isTeacher ? 'teacher' : 'student'}>{children}</AdminLayout>;
}

export function RoleView({ admin, teacher, student }: { admin: ReactNode; teacher: ReactNode; student?: ReactNode }) {
  const { role } = useAuth();
  if (role === 'STUDENT') return <>{student ?? null}</>;
  return <>{role === 'TEACHER' ? teacher : admin}</>;
}
