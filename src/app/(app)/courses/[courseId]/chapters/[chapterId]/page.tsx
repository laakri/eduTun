import { redirect } from "next/navigation";
export default async function ChapterStudioPage({ params }: { params: Promise<{ courseId: string; chapterId: string }> }) { const { courseId, chapterId } = await params; redirect(`/learn/${courseId}/chapters/${chapterId}`); }
