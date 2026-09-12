import { z } from "zod";

import { requireUser } from "@/core/auth.service";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import { db } from "@/lib/db";
import { ok, withErrorHandler } from "@/lib/api-response";
import { parseBody } from "@/lib/parse-body";

const requestSchema = z.object({
  planId: z.string().cuid(),
  bacTypeId: z.string().cuid(),
});

export const GET = withErrorHandler(async () => {
  const user = await requireUser();
  const [requests, subscriptions] = await Promise.all([
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
  ]);

  return ok({ requests, subscriptions });
});

export const POST = withErrorHandler(async (req) => {
  const user = await requireUser();
  const input = await parseBody(req, requestSchema);
  const plan = await db.subscriptionPlan.findUnique({
    where: { id: input.planId },
    select: { id: true, domainId: true, isActive: true },
  });

  if (!plan || !plan.isActive) throw new NotFoundError("Subscription plan");
  if (plan.domainId !== input.bacTypeId) {
    throw new ValidationError("The selected Bac type does not match this access plan.");
  }

  const existing = await db.bacAccessRequest.findFirst({
    where: {
      userId: user.id,
      planId: input.planId,
      bacTypeId: input.bacTypeId,
      status: { in: ["pending", "approved"] },
    },
    orderBy: { createdAt: "desc" },
  });

  if (existing?.status === "pending") {
    throw new ConflictError("Your access request is already waiting for admin approval.");
  }
  if (existing?.status === "approved") {
    throw new ConflictError("You already have approved access for this Bac type.");
  }

  const request = await db.bacAccessRequest.create({
    data: {
      userId: user.id,
      planId: input.planId,
      bacTypeId: input.bacTypeId,
    },
    include: {
      plan: { select: { id: true, name: true, slug: true } },
      bacType: { select: { id: true, name: true, slug: true } },
    },
  });

  return ok({ request }, 201);
});
