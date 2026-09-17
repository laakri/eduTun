import { requireRole } from "@/core/auth.service";
import { ok, withErrorHandler } from "@/lib/api-response";
import { db } from "@/lib/db";

export const GET = withErrorHandler(async (request) => {
  await requireRole("admin");
  const params = new URL(request.url).searchParams;
  const query = params.get("q")?.trim() ?? "";
  const status = params.get("status") ?? "all";
  const page = Math.max(Number(params.get("page") ?? 1), 1);
  const pageSize = Math.min(Math.max(Number(params.get("pageSize") ?? 20), 5), 50);
  const where = {
    ...(status !== "all" ? { status } : {}),
    ...(query ? { OR: [{ fullName: { contains: query, mode: "insensitive" as const } }, { applicant: { email: { contains: query, mode: "insensitive" as const } } }] } : {}),
  };
  const [total, applications] = await Promise.all([
    db.profApplication.count({ where }),
    db.profApplication.findMany({
    where,
    include: {
      applicant: { select: { email: true } },
      categories: { include: { category: { select: { name: true, slug: true } } } },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    skip: (page - 1) * pageSize,
    take: pageSize,
    }),
  ]);
  return ok({ items: applications, total, page, pageSize, pageCount: Math.ceil(total / pageSize) });
});
