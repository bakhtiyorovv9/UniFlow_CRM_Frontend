import { HomeworkResultsPage } from '../../../../../../features/teacher/HomeworkResultsPage';

export default async function Page({ params }: { params: Promise<{ id: string; homeworkId: string }> }) {
  const { id, homeworkId } = await params;
  return <HomeworkResultsPage groupId={Number(id)} homeworkId={Number(homeworkId)} />;
}
