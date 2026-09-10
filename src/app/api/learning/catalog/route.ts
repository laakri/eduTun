import { requireUser } from "@/core/auth.service";
import { db } from "@/lib/db";
import { ok, withErrorHandler } from "@/lib/api-response";

export const GET = withErrorHandler(async () => {
  const user = await requireUser();
  const [courses, enrollments, categories] = await Promise.all([
    db.course.findMany({
      where: { published: true },
      include: {
        prof: { select: { fullName: true } },
        categories: { include: { category: true } },
        tags: { include: { tag: true } },
        chapters: {
          orderBy: { order: "asc" },
          include: {
            quiz: { select: { id: true } },
            _count: { select: { resources: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.packEnrollment.findMany({
      where: { userId: user.id, status: "active" },
      select: {
        pack: {
          select: { items: { select: { courseId: true, categoryId: true } } },
        },
      },
    }),
    db.category.findMany({ select: { id: true, parentId: true } }),
  ]);

  const directCourseIds = new Set<string>();
  const grantedCategoryIds = new Set<string>();
  for (const enrollment of enrollments) {
    for (const item of enrollment.pack.items) {
      if (item.courseId) directCourseIds.add(item.courseId);
      if (item.categoryId) grantedCategoryIds.add(item.categoryId);
    }
  }

  const parentById = new Map(
    categories.map((category) => [category.id, category.parentId]),
  );
  const canAccessCategory = (categoryId: string) => {
    let currentId: string | null = categoryId;
    const visited = new Set<string>();
    while (currentId && !visited.has(currentId)) {
      if (grantedCategoryIds.has(currentId)) return true;
      visited.add(currentId);
      currentId = parentById.get(currentId) ?? null;
    }
    return false;
  };

  const accessibleCourses = courses
    .filter(
      (course) =>
        directCourseIds.has(course.id) ||
        course.categories.some(({ categoryId }) =>
          canAccessCategory(categoryId),
        ),
    )
    .map((course) => ({
      id: course.id,
      title: course.title,
      description: course.description ?? "",
      published: course.published,
      categories: course.categories.map(({ category }) => category.name),
      tags: course.tags.map(({ tag }) => tag.name),
      prof: { name: course.prof.fullName, role: "Course instructor" },
      chapters: course.chapters.map((chapter) => ({
        id: chapter.id,
        title: chapter.title,
        order: chapter.order,
        durationSeconds: chapter.durationSeconds,
        videoStatus: chapter.videoStatus,
        hasQuiz: Boolean(chapter.quiz),
        resourceCount: chapter._count.resources,
      })),
    }));

  return ok({
    courses: accessibleCourses,
    hasActivePack: enrollments.length > 0,
  });
});
