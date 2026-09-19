'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { Course, Group, Payment, Room, Staff, Student, Teacher } from './api';
import { CourseFormDialog } from './forms/CourseFormDialog';
import { GroupFormDialog } from './forms/GroupFormDialog';
import { PaymentFormDialog } from './forms/PaymentFormDialog';
import { RoomFormDialog } from './forms/RoomFormDialog';
import { StaffFormDialog } from './forms/StaffFormDialog';
import { StudentFormDialog } from './forms/StudentFormDialog';
import { TeacherFormDialog } from './forms/TeacherFormDialog';

type DialogState =
  | { kind: 'teacher'; entity?: Teacher }
  | { kind: 'student'; entity?: Student }
  | { kind: 'group'; entity?: Group }
  | { kind: 'course'; entity?: Course }
  | { kind: 'room'; entity?: Room }
  | { kind: 'staff'; entity?: Staff }
  | { kind: 'payment'; entity?: Payment; studentId?: number };

type AdminDialogsValue = {
  openTeacherForm: (teacher?: Teacher) => void;
  openStudentForm: (student?: Student) => void;
  openGroupForm: (group?: Group) => void;
  openCourseForm: (course?: Course) => void;
  openRoomForm: (room?: Room) => void;
  openStaffForm: (staff?: Staff) => void;
  openPaymentForm: (payment?: Payment, defaults?: { studentId?: number }) => void;
};

const AdminDialogsContext = createContext<AdminDialogsValue | null>(null);

export function AdminDialogsProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<(DialogState & { nonce: number }) | null>(null);
  const close = useCallback(() => setState(null), []);

  const value = useMemo<AdminDialogsValue>(
    () => ({
      openTeacherForm: (entity) => setState({ kind: 'teacher', entity, nonce: Date.now() }),
      openStudentForm: (entity) => setState({ kind: 'student', entity, nonce: Date.now() }),
      openGroupForm: (entity) => setState({ kind: 'group', entity, nonce: Date.now() }),
      openCourseForm: (entity) => setState({ kind: 'course', entity, nonce: Date.now() }),
      openRoomForm: (entity) => setState({ kind: 'room', entity, nonce: Date.now() }),
      openStaffForm: (entity) => setState({ kind: 'staff', entity, nonce: Date.now() }),
      openPaymentForm: (entity, defaults) =>
        setState({ kind: 'payment', entity, studentId: defaults?.studentId, nonce: Date.now() }),
    }),
    [],
  );

  return (
    <AdminDialogsContext.Provider value={value}>
      {children}
      {state?.kind === 'teacher' && <TeacherFormDialog key={state.nonce} open onClose={close} teacher={state.entity} />}
      {state?.kind === 'student' && <StudentFormDialog key={state.nonce} open onClose={close} student={state.entity} />}
      {state?.kind === 'group' && <GroupFormDialog key={state.nonce} open onClose={close} group={state.entity} />}
      {state?.kind === 'course' && <CourseFormDialog key={state.nonce} open onClose={close} course={state.entity} />}
      {state?.kind === 'room' && <RoomFormDialog key={state.nonce} open onClose={close} room={state.entity} />}
      {state?.kind === 'staff' && <StaffFormDialog key={state.nonce} open onClose={close} staff={state.entity} />}
      {state?.kind === 'payment' && (
        <PaymentFormDialog key={state.nonce} open onClose={close} payment={state.entity} studentId={state.studentId} />
      )}
    </AdminDialogsContext.Provider>
  );
}

export function useAdminDialogs() {
  const context = useContext(AdminDialogsContext);
  if (!context) throw new Error('useAdminDialogs must be used inside AdminDialogsProvider');
  return context;
}
