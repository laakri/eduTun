import { redirect } from "next/navigation";

export default async function ChapterPage({ params }: { params: Promise<{ courseId: string; chapterId: string }> }) {
  const { courseId, chapterId } = await params;
  redirect(`/learn/${courseId}?chapter=${chapterId}`);
}
