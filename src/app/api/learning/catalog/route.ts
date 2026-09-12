import { requireUser } from "@/core/auth.service";
import { db } from "@/lib/db";
import { ok, withErrorHandler } from "@/lib/api-response";

function collectDescendantCategoryIds(
  domainId: string,
  categoryLinks: Array<{ parentId: string; childId: string }>,
) {
  const ids = new Set<string>();
  const stack = [domainId];

  while (stack.length > 0) {
    const currentId = stack.pop();
    if (!currentId || ids.has(currentId)) continue;
    ids.add(currentId);

    for (const link of categoryLinks) {
      if (link.parentId === currentId) {
        stack.push(link.childId);
      }
    }
  }

  return ids;
}

export const GET = withErrorHandler(async () => {
  const user = await requireUser();
  const [courses, activeSubscriptions, categories, categoryRows] = await Promise.all([
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
      select: {
        id: true,
        bacTypeId: true,
        plan: { select: { domainId: true, name: true } },
        bacType: { select: { name: true } },
        categorySelections: { select: { categoryId: true } },
      },
    }),
    db.categoryRelation.findMany({ select: { parentId: true, childId: true } }),
    db.category.findMany({ select: { id: true, name: true, slug: true } }),
  ]);

  const categoryLinks = categories;
  const parentMap = new Map<string, string[]>();
  for (const link of categoryLinks) {
    const parents = parentMap.get(link.childId) ?? [];
    parents.push(link.parentId);
    parentMap.set(link.childId, parents);
  }

  const grantedCategoryIds = new Set<string>();
  const subscriptionsNeedingCategories = activeSubscriptions.filter(
    (subscription) => subscription.bacTypeId && subscription.categorySelections.length === 0,
  );
  for (const subscription of activeSubscriptions) {
    if (subscription.bacTypeId && subscription.categorySelections.length === 0) continue;
    const roots = subscription.categorySelections.length > 0
      ? subscription.categorySelections.map((selection) => selection.categoryId)
      : [subscription.plan.domainId];
    const domainCategoryIds = new Set<string>();
    for (const root of roots) {
      for (const categoryId of collectDescendantCategoryIds(root, categoryLinks)) {
        domainCategoryIds.add(categoryId);
      }
    }
    for (const categoryId of domainCategoryIds) grantedCategoryIds.add(categoryId);
  }

  const availableCategories = subscriptionsNeedingCategories.flatMap((subscription) => {
    const ids = new Set(
      categoryLinks
        .filter((link) => link.parentId === subscription.bacTypeId)
        .map((link) => link.childId),
    );
    return categoryRows.filter((category) => ids.has(category.id));
  });

  const canAccessCategory = (categoryId: string) => {
    const stack: string[] = [categoryId];
    const visited = new Set<string>();
    while (stack.length > 0) {
      const currentId = stack.pop();
      if (!currentId || visited.has(currentId)) continue;
      visited.add(currentId);
      if (grantedCategoryIds.has(currentId)) return true;
      for (const parentId of parentMap.get(currentId) ?? []) {
        if (!visited.has(parentId)) stack.push(parentId);
      }
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
    needsCategorySelection: subscriptionsNeedingCategories.length > 0,
    categorySelectionSubscriptionId: subscriptionsNeedingCategories[0]?.id ?? null,
    availableCategories: [...new Map(availableCategories.map((category) => [category.id, category])).values()],
    subscriptions: activeSubscriptions.map((subscription) => ({
      id: subscription.id,
      bacTypeId: subscription.bacTypeId,
      bacTypeName: subscription.bacType?.name ?? null,
      planName: subscription.plan.name,
      selectedCategoryIds: subscription.categorySelections.map((selection) => selection.categoryId),
    })),
  });
});
