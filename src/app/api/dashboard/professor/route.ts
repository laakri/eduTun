import { requireCourseManager } from "@/core/auth.service";
import { db } from "@/lib/db";
import { ok, withErrorHandler } from "@/lib/api-response";

export const GET = withErrorHandler(async () => {
  const user = await requireCourseManager();
  const courses = await db.course.findMany({
    where: { profId: user.id },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      description: true,
      published: true,
      updatedAt: true,
      chapters: {
        select: {
          id: true,
          title: true,
          published: true,
          durationSeconds: true,
          videoStatus: true,
          progress: { select: { userId: true, completed: true, updatedAt: true } },
        },
      },
    },
  });

  const studentIds = new Set(
    courses.flatMap((course) => course.chapters.flatMap((chapter) => chapter.progress.map((progress) => progress.userId))),
  );

  const chapterCount = courses.reduce((total, course) => total + course.chapters.length, 0);
  const durationSeconds = courses.reduce(
    (total, course) => total + course.chapters.reduce((courseTotal, chapter) => courseTotal + (chapter.durationSeconds ?? 0), 0),
    0,
  );

  const progressEntries = courses.flatMap((course) =>
    course.chapters.flatMap((chapter) => chapter.progress),
  );
  const completedEntries = progressEntries.filter((entry) => entry.completed).length;
  const activeSince = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const activeLearners = new Set(
    progressEntries
      .filter((entry) => entry.updatedAt >= activeSince)
      .map((entry) => entry.userId),
  );
  const progressRate = progressEntries.length
    ? Math.round((completedEntries / progressEntries.length) * 100)
    : 0;

  const comments = await db.chapterComment.findMany({
    where: { chapter: { course: { profId: user.id } } },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: {
      id: true,
      body: true,
      createdAt: true,
      user: { select: { fullName: true } },
      chapter: { select: { title: true, course: { select: { title: true } } } },
    },
  });

  return ok({
    user: { fullName: user.name ?? "Professor" },
    stats: {
      courses: courses.length,
      publishedCourses: courses.filter((course) => course.published).length,
      students: studentIds.size,
      chapters: chapterCount,
      hours: Math.round((durationSeconds / 3600) * 10) / 10,
    },
    learning: {
      progressEntries: progressEntries.length,
      completedEntries,
      completionRate: progressRate,
      activeLearnersLast7Days: activeLearners.size,
    },
    courses: courses.slice(0, 5).map((course) => ({
      id: course.id,
      title: course.title,
      description: course.description,
      published: course.published,
      chapters: course.chapters.length,
      students: new Set(course.chapters.flatMap((chapter) => chapter.progress.map((progress) => progress.userId))).size,
      readyChapters: course.chapters.filter((chapter) => chapter.videoStatus === "READY").length,
      updatedAt: course.updatedAt,
    })),
    activity: comments.map((comment) => ({
      id: comment.id,
      title: "New comment",
      description: `${comment.user.fullName} commented on ${comment.chapter.title}`,
      createdAt: comment.createdAt,
      courseTitle: comment.chapter.course.title,
    })),
  });
});