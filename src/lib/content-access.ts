import { db } from "@/lib/db";

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

  const categoryLinks = await db.categoryRelation.findMany({
    select: { parentId: true, childId: true },
  });

  const grantedCategoryIds = new Set<string>();
  for (const subscription of activeSubscriptions) {
    const domainIds = collectDescendantCategoryIds(
      subscription.plan.domainId,
      categoryLinks,
    );
    for (const domainId of domainIds) grantedCategoryIds.add(domainId);
  }

  const parentMap = new Map<string, string[]>();
  for (const link of categoryLinks) {
    const parents = parentMap.get(link.childId) ?? [];
    parents.push(link.parentId);
    parentMap.set(link.childId, parents);
  }

  return course.categories.some(({ categoryId }) => {
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
  });
}
