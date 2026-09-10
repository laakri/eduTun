import { requireUser } from "@/core/auth.service";
import { db } from "@/lib/db";
import { ok, withErrorHandler } from "@/lib/api-response";

function collectDescendantCategoryIds(
  domainId: string,
  categories: Array<{ id: string; parentId: string | null }>,
) {
  const ids = new Set<string>();
  const stack = [domainId];

  while (stack.length > 0) {
    const currentId = stack.pop();
    if (!currentId || ids.has(currentId)) continue;
    ids.add(currentId);

    for (const category of categories) {
      if (category.parentId === currentId) {
        stack.push(category.id);
      }
    }
  }

  return ids;
}

export const GET = withErrorHandler(async () => {
  const user = await requireUser();
  const [courses, activeSubscriptions, categories] = await Promise.all([
    db.course.findMany({
      where: { published: true },
      include: {
        prof: { select: { id: true, fullName: true } },
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
    db.userSubscription.findMany({
      where: {
        userId: user.id,
        status: "active",
        expiresAt: { gt: new Date() },
      },
      select: { plan: { select: { domainId: true } } },
    }),
    db.category.findMany({ select: { id: true, parentId: true } }),
  ]);

  const grantedCategoryIds = new Set<string>();
  for (const subscription of activeSubscriptions) {
    const domainCategoryIds = collectDescendantCategoryIds(
      subscription.plan.domainId,
      categories,
    );
    for (const categoryId of domainCategoryIds) grantedCategoryIds.add(categoryId);
  }

  const canAccessCategory = (categoryId: string) => {
    let currentId: string | null = categoryId;
    const visited = new Set<string>();
    while (currentId && !visited.has(currentId)) {
      if (grantedCategoryIds.has(currentId)) return true;
      visited.add(currentId);
      const parent = categories.find((category) => category.id === currentId);
      currentId = parent?.parentId ?? null;
    }
    return false;
  };

  const accessibleCourses = courses
    .filter((course) =>
      course.categories.some(({ categoryId }) => canAccessCategory(categoryId)),
    )
    .map((course) => ({
      id: course.id,
      title: course.title,
      description: course.description ?? "",
      published: course.published,
      categories: course.categories.map(({ category }) => category.name),
      tags: course.tags.map(({ tag }) => tag.name),
      prof: {
        id: course.prof.id,
        name: course.prof.fullName,
        role: "Course instructor",
      },
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

  const hasActiveSubscription = activeSubscriptions.length > 0;

  return ok({
    courses: accessibleCourses,
    hasActivePack: hasActiveSubscription,
    hasActiveSubscription,
  });
});
