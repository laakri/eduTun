import { requireRole } from "@/core/auth.service";
import { db } from "@/lib/db";
import { ok, withErrorHandler } from "@/lib/api-response";

export const GET = withErrorHandler(async (request) => {
  await requireRole("admin");
  const params = new URL(request.url).searchParams;
  const query = params.get("q")?.trim() ?? "";
  const status = params.get("status") ?? "all";
  const page = Math.max(Number(params.get("page") ?? 1), 1);
  const pageSize = Math.min(Math.max(Number(params.get("pageSize") ?? 20), 5), 50);
  const where = {
    ...(status !== "all" ? { status } : {}),
    ...(query ? { OR: [{ user: { fullName: { contains: query, mode: "insensitive" as const } } }, { user: { email: { contains: query, mode: "insensitive" as const } } }, { bacType: { name: { contains: query, mode: "insensitive" as const } } }] } : {}),
  };

  const [total, requests] = await Promise.all([
    db.bacAccessRequest.count({ where }),
    db.bacAccessRequest.findMany({
      where,
      include: {
      user: { select: { id: true, fullName: true, email: true } },
      plan: { select: { id: true, name: true, slug: true } },
      bacType: { select: { id: true, name: true, slug: true } },
      reviewedBy: { select: { fullName: true } },
    },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return ok({ items: requests, total, page, pageSize, pageCount: Math.ceil(total / pageSize) });
});

export const DELETE = withErrorHandler(async (request) => {
  await requireRole("admin");
  const id = new URL(request.url).searchParams.get("id");
  if (!id) throw new Error("Request id is required.");
  const requestRow = await db.bacAccessRequest.findUnique({ where: { id }, select: { status: true } });
  if (!requestRow) throw new Error("Access request not found.");
  if (requestRow.status === "pending") throw new Error("Pending requests cannot be deleted.");
  await db.bacAccessRequest.delete({ where: { id } });
  return ok({ deleted: true });
});
