import { db } from "@/lib/db";

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

/** A domain subscription grants access to the full category subtree. */
export async function hasCourseAccess(userId: string, courseId: string) {
  const [course, activeSubscriptions] = await Promise.all([
    db.course.findUnique({
      where: { id: courseId },
      select: { categories: { select: { categoryId: true } } },
    }),
    db.userSubscription.findMany({
      where: {
        userId,
        status: "active",
        expiresAt: { gt: new Date() },
      },
      select: { plan: { select: { domainId: true } } },
    }),
  ]);

  if (!course) return false;

  if (activeSubscriptions.length === 0) return false;

  const categories = await db.category.findMany({
    select: { id: true, parentId: true },
  });

  const grantedCategoryIds = new Set<string>();
  for (const subscription of activeSubscriptions) {
    const domainIds = collectDescendantCategoryIds(
      subscription.plan.domainId,
      categories,
    );
    for (const domainId of domainIds) grantedCategoryIds.add(domainId);
  }

  return course.categories.some(({ categoryId }) => {
    let currentId: string | null = categoryId;
    const visited = new Set<string>();

    while (currentId && !visited.has(currentId)) {
      if (grantedCategoryIds.has(currentId)) return true;
      visited.add(currentId);
      const parent = categories.find((category) => category.id === currentId);
      currentId = parent?.parentId ?? null;
    }

    return false;
  });
}
