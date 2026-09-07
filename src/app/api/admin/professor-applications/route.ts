import { requireRole } from "@/core/auth.service";
import { ok, withErrorHandler } from "@/lib/api-response";
import { db } from "@/lib/db";

export const GET = withErrorHandler(async () => {
  await requireRole("admin");
  const applications = await db.profApplication.findMany({
    include: {
      applicant: { select: { email: true } },
      categories: { include: { category: { select: { name: true, slug: true } } } },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });
  return ok(applications);
});
