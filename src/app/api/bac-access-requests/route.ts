import { z } from "zod";

import { requireUser } from "@/core/auth.service";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import { db } from "@/lib/db";
import { ok, withErrorHandler } from "@/lib/api-response";
import { parseBody } from "@/lib/parse-body";

const requestSchema = z.object({
  planId: z.string().cuid().optional(),
  bacTypeId: z.string().cuid(),
});

export const GET = withErrorHandler(async () => {
  const sessionUser = await requireUser();
  const user = await db.user.findUnique({ where: { email: sessionUser.email }, select: { id: true } });
  if (!user) throw new NotFoundError("User");
  const [requests, subscriptions, profile] = await Promise.all([
    db.bacAccessRequest.findMany({
      where: { userId: user.id },
      include: {
        plan: { select: { id: true, name: true, slug: true } },
        bacType: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.userSubscription.findMany({
      where: { userId: user.id, status: "active", expiresAt: { gt: new Date() } },
      include: {
        plan: { select: { id: true, name: true, slug: true } },
        bacType: { select: { id: true, name: true, slug: true } },
        categorySelections: {
          include: { category: { select: { id: true, name: true, slug: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.user.findUnique({
      where: { id: user.id },
      select: { bacType: { select: { id: true, name: true, slug: true } } },
    }),
  ]);

  return ok({ requests, subscriptions, bacType: profile?.bacType ?? null });
});

export const POST = withErrorHandler(async (req) => {
  const sessionUser = await requireUser();
  const user = await db.user.findUnique({ where: { email: sessionUser.email }, select: { id: true } });
  if (!user) throw new NotFoundError("User");
  const input = await parseBody(req, requestSchema);
  if (input.planId) {
    const plan = await db.subscriptionPlan.findFirst({
      where: { id: input.planId, isActive: true },
      select: { id: true, domainId: true },
    });

    if (!plan) throw new NotFoundError("Subscription plan");
    const selectedBacType = await db.categoryRelation.findUnique({
      where: { parentId_childId: { parentId: plan.domainId, childId: input.bacTypeId } },
      select: { childId: true },
    });
    if (!selectedBacType) throw new ValidationError("The selected Bac type does not match this access plan.");

    const existing = await db.bacAccessRequest.findFirst({
      where: { userId: user.id, planId: plan.id, bacTypeId: input.bacTypeId, status: { in: ["pending", "approved"] } },
      orderBy: { createdAt: "desc" },
    });
    if (existing?.status === "pending") throw new ConflictError("Your access request is already waiting for admin approval.");
    if (existing?.status === "approved") throw new ConflictError("You already have approved access for this Bac type.");

    const request = await db.bacAccessRequest.create({
      data: { userId: user.id, planId: plan.id, bacTypeId: input.bacTypeId },
      include: {
        plan: { select: { id: true, name: true, slug: true } },
        bacType: { select: { id: true, name: true, slug: true } },
      },
    });
    return ok({ request }, 201);
  }

  const bac = await db.category.findUnique({ where: { slug: "bac" }, select: { id: true } });
  if (!bac) throw new NotFoundError("Bac category");

  const selectedBacType = await db.categoryRelation.findUnique({
    where: {
      parentId_childId: {
        parentId: bac.id,
        childId: input.bacTypeId,
      },
    },
    select: { childId: true },
  });
  if (!selectedBacType) {
    throw new ValidationError("The selected category is not a valid Bac type.");
  }

  const updatedUser = await db.user.update({
    where: { id: user.id },
    data: { bacTypeId: input.bacTypeId },
    select: { bacType: { select: { id: true, name: true, slug: true } } },
  });

  return ok({ bacType: updatedUser.bacType });
});
