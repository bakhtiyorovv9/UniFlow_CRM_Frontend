import { GroupDetailPage } from '../../../../features/admin/group/GroupDetailPage';
import { RoleView } from '../../../../features/auth/RoleShell';
import { StudentGroupPage } from '../../../../features/student/StudentGroupPage';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const groupId = Number(id);
  const detail = <GroupDetailPage groupId={groupId} />;
  return <RoleView admin={detail} teacher={detail} student={<StudentGroupPage groupId={groupId} />} />;
}
