import { requireRole } from "@/core/auth.service";
import { db } from "@/lib/db";
import { ok, withErrorHandler } from "@/lib/api-response";

export const GET = withErrorHandler(async () => {
  await requireRole("admin");

  const requests = await db.bacAccessRequest.findMany({
    include: {
      user: { select: { id: true, fullName: true, email: true } },
      plan: { select: { id: true, name: true, slug: true } },
      bacType: { select: { id: true, name: true, slug: true } },
      reviewedBy: { select: { fullName: true } },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  return ok(requests);
});
