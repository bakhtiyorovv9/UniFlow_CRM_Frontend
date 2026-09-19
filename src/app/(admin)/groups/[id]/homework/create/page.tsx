import { HomeworkCreatePage } from '../../../../../../features/teacher/HomeworkCreatePage';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <HomeworkCreatePage groupId={Number(id)} />;
}
