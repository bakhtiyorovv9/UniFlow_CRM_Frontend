import { LessonDayPage } from '../../../../../../features/teacher/LessonDayPage';

export default async function Page({ params }: { params: Promise<{ id: string; date: string }> }) {
  const { id, date } = await params;
  return <LessonDayPage groupId={Number(id)} date={date} />;
}
