import { ExamPage } from '../../../../../../features/teacher/ExamPage';

export default async function Page({ params }: { params: Promise<{ id: string; examId: string }> }) {
  const { id, examId } = await params;
  return <ExamPage groupId={Number(id)} examId={Number(examId)} />;
}
