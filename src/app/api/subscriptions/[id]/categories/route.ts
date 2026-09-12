import { z } from "zod";

import { requireUser } from "@/core/auth.service";
import { db } from "@/lib/db";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { ok, withErrorHandler } from "@/lib/api-response";
import { parseBody } from "@/lib/parse-body";

const selectionSchema = z.object({
  categoryIds: z.array(z.string().cuid()).min(1),
});

function collectDescendants(rootId: string, links: Array<{ parentId: string; childId: string }>) {
  const ids = new Set<string>();
  const stack = [rootId];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || ids.has(current)) continue;
    ids.add(current);
    for (const link of links) {
      if (link.parentId === current) stack.push(link.childId);
    }
  }
  return ids;
}

export const POST = withErrorHandler(
  async (req, { params }: { params: Promise<{ id: string }> }) => {
    const user = await requireUser();
    const { id } = await params;
    const input = await parseBody(req, selectionSchema);
    const subscription = await db.userSubscription.findUnique({
      where: { id },
      select: { id: true, userId: true, status: true, expiresAt: true, bacTypeId: true },
    });

    if (!subscription) throw new NotFoundError("Subscription");
    if (subscription.userId !== user.id) throw new ForbiddenError("You cannot edit this subscription.");
    if (subscription.status !== "active" || subscription.expiresAt <= new Date()) {
      throw new ValidationError("This subscription is not active.");
    }
    if (!subscription.bacTypeId) {
      throw new ValidationError("This legacy subscription does not use Bac category selection.");
    }

    const links = await db.categoryRelation.findMany({ select: { parentId: true, childId: true } });
    const allowedIds = collectDescendants(subscription.bacTypeId, links);
    const categoryIds = [...new Set(input.categoryIds)];
    if (categoryIds.some((categoryId) => !allowedIds.has(categoryId) || categoryId === subscription.bacTypeId)) {
      throw new ValidationError("Choose categories inside your approved Bac type.");
    }

    await db.$transaction([
      db.userSubscriptionCategory.deleteMany({ where: { subscriptionId: id } }),
      db.userSubscriptionCategory.createMany({
        data: categoryIds.map((categoryId) => ({ subscriptionId: id, categoryId })),
      }),
    ]);

    return ok({ subscriptionId: id, categoryIds });
  },
);
