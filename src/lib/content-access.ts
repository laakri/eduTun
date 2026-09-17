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

/** Resolve the categories granted by active subscriptions, including subject selections. */
export async function getGrantedCategoryIds(userId: string) {
  const [activeSubscriptions, categoryLinks] = await Promise.all([
    db.userSubscription.findMany({
      where: {
        userId,
        status: "active",
        expiresAt: { gt: new Date() },
      },
      select: {
        bacTypeId: true,
        plan: { select: { domainId: true } },
        categorySelections: { select: { categoryId: true } },
      },
    }),
    db.categoryRelation.findMany({ select: { parentId: true, childId: true } }),
  ]);

  const grantedCategoryIds = new Set<string>();
  for (const subscription of activeSubscriptions) {
    const roots = subscription.bacTypeId
      ? [subscription.bacTypeId]
      : subscription.categorySelections.length > 0
        ? subscription.categorySelections.map((selection) => selection.categoryId)
        : [subscription.plan.domainId];

    for (const root of roots) {
      for (const categoryId of collectDescendantCategoryIds(root, categoryLinks)) {
        grantedCategoryIds.add(categoryId);
      }
    }
  }

  return { categoryLinks, grantedCategoryIds };
}

/** A subscription grants access only to its selected subject subtree. */
export async function hasCourseAccess(userId: string, courseId: string) {
  const course = await db.course.findUnique({
    where: { id: courseId },
    select: { categories: { select: { categoryId: true } } },
  });

  if (!course) return false;

  const { categoryLinks, grantedCategoryIds } = await getGrantedCategoryIds(userId);
  if (grantedCategoryIds.size === 0) return false;

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
        stack.push(parentId);
      }
    }
    return false;
  });
}
