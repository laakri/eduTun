import { requireUser } from "@/core/auth.service";
import { db } from "@/lib/db";
import { ConflictError } from "@/lib/errors";
import { ok, withErrorHandler } from "@/lib/api-response";

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

export const POST = withErrorHandler(async () => {
  await requireUser();
  throw new ConflictError("Subscription access requires an admin-approved Bac access request.");
});
