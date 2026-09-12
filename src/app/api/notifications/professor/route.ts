import { requireCourseManager } from "@/core/auth.service";
import { db } from "@/lib/db";
import { ok, withErrorHandler } from "@/lib/api-response";

export const GET = withErrorHandler(async () => {
  const user = await requireCourseManager();
  const [comments, ratings, courses] = await Promise.all([
    db.chapterComment.findMany({ where: { chapter: { course: { profId: user.id } } }, orderBy: { createdAt: "desc" }, take: 10, select: { id: true, body: true, createdAt: true, user: { select: { fullName: true } }, chapter: { select: { title: true } } } }),
    db.professorRating.findMany({ where: { professorId: user.id }, orderBy: { createdAt: "desc" }, take: 10, select: { id: true, rating: true, createdAt: true, user: { select: { fullName: true } } } }),
    db.course.findMany({ where: { profId: user.id }, orderBy: { updatedAt: "desc" }, take: 10, select: { id: true, title: true, updatedAt: true } }),
  ]);

  const notifications = [
    ...comments.map((item) => ({ id: `comment-${item.id}`, type: "comment", title: "New chapter comment", description: `${item.user.fullName} commented on ${item.chapter.title}`, createdAt: item.createdAt })),
    ...ratings.map((item) => ({ id: `rating-${item.id}`, type: "rating", title: "New profile rating", description: `${item.user.fullName} left a ${item.rating}/5 rating`, createdAt: item.createdAt })),
    ...courses.map((item) => ({ id: `course-${item.id}`, type: "course", title: "Course updated", description: item.title, createdAt: item.updatedAt })),
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 15);

  return ok(notifications);
});