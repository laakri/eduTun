import { z } from "zod";

import { requireRole } from "@/core/auth.service";
import { db } from "@/lib/db";
import { ok, withErrorHandler } from "@/lib/api-response";

const querySchema = z.object({
  role: z.enum(["student", "prof"]),
  q: z.string().trim().max(100).default(""),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(5).max(50).default(20),
});

export const GET = withErrorHandler(async (request) => {
  await requireRole("admin");
  const params = new URL(request.url).searchParams;
  const input = querySchema.parse({
    role: params.get("role"),
    q: params.get("q") ?? "",
    page: params.get("page") ?? "1",
    pageSize: params.get("pageSize") ?? "20",
  });
  const where = {
    roles: { some: { role: { slug: input.role } } },
    ...(input.q
      ? {
          OR: [
            { fullName: { contains: input.q, mode: "insensitive" as const } },
            { email: { contains: input.q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
  const [total, users] = await Promise.all([
    db.user.count({ where }),
    db.user.findMany({
      where,
      select: {
        id: true,
        fullName: true,
        email: true,
        avatarUrl: true,
        createdAt: true,
        roles: { select: { role: { select: { slug: true } } } },
        subscriptions: {
          where: { status: "active" },
          select: {
            plan: { select: { name: true } },
            bacType: { select: { name: true } },
            expiresAt: true,
          },
          orderBy: { expiresAt: "desc" },
          take: 3,
        },
        coursesTaught: { select: { id: true }, where: { published: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
    }),
  ]);

  return ok({
    items: users.map((user) => ({
      ...user,
      courseCount: user.coursesTaught.length,
      coursesTaught: undefined,
      roles: user.roles.map((item) => item.role.slug),
    })),
    page: input.page,
    pageSize: input.pageSize,
    total,
    pageCount: Math.ceil(total / input.pageSize),
  });
});