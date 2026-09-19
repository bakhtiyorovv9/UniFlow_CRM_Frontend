import { GroupsPage } from '../../../features/admin/pages/GroupsPage';
import { RoleView } from '../../../features/auth/RoleShell';
import { StudentGroupsPage } from '../../../features/student/StudentGroupsPage';
import { TeacherGroupsPage } from '../../../features/teacher/TeacherGroupsPage';

export default function Page() {
  return <RoleView admin={<GroupsPage />} teacher={<TeacherGroupsPage />} student={<StudentGroupsPage />} />;
}
