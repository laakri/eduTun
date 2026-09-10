import { z } from "zod";

import { requireUser } from "@/core/auth.service";
import { db } from "@/lib/db";
import { ok, withErrorHandler } from "@/lib/api-response";
import { NotFoundError } from "@/lib/errors";

const billingCycleSchema = z.enum(["month", "quarter", "year"]);

const createSubscriptionSchema = z.object({
  planId: z.string().min(1),
  billingCycle: billingCycleSchema,
});

export const GET = withErrorHandler(async () => {
  const plans = await db.subscriptionPlan.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
    include: {
      domain: {
        select: { id: true, name: true, slug: true },
      },
    },
  });

  return ok({ plans });
});

export const POST = withErrorHandler(async (req) => {
  const user = await requireUser();
  const body = await req.json().catch(() => ({}));
  const parsed = createSubscriptionSchema.safeParse(body);

  if (!parsed.success) {
    throw new NotFoundError("Subscription plan");
  }

  const { planId, billingCycle } = parsed.data;
  const plan = await db.subscriptionPlan.findUnique({
    where: { id: planId },
  });

  if (!plan || !plan.isActive) {
    throw new NotFoundError("Subscription plan");
  }

  const startAt = new Date();
  const expiresAt = (() => {
    const msPerMonth = 30 * 24 * 60 * 60 * 1000;
    const months = billingCycle === "month" ? 1 : billingCycle === "quarter" ? 3 : 12;
    return new Date(startAt.getTime() + months * msPerMonth);
  })();

  const existingActive = await db.userSubscription.findFirst({
    where: {
      userId: user.id,
      planId: plan.id,
      status: "active",
      expiresAt: { gt: startAt },
    },
  });

  if (existingActive) {
    return ok({
      subscription: existingActive,
      message: "You already have an active subscription for this domain.",
    }, 200);
  }

  const subscription = await db.userSubscription.create({
    data: {
      userId: user.id,
      planId: plan.id,
      billingCycle,
      status: "active",
      startedAt: startAt,
      expiresAt,
    },
  });

  return ok({ subscription }, 201);
});
