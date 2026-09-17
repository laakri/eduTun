import { z } from "zod";

import { requireRole } from "@/core/auth.service";
import { db } from "@/lib/db";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { ok, withErrorHandler } from "@/lib/api-response";

export const DELETE = withErrorHandler(async (_request, { params }: { params: Promise<{ id: string }> }) => {
  const admin = await requireRole("admin");
  const { id } = await params;
  z.string().cuid().parse(id);
  if (id === admin.id) throw new ForbiddenError("You cannot delete your own admin account.");
  const user = await db.user.findUnique({
    where: { id },
    select: { id: true, roles: { select: { role: { select: { slug: true } } } } },
  });
  if (!user) throw new NotFoundError("User");
  if (user.roles.some((item) => item.role.slug === "admin")) {
    throw new ForbiddenError("Admin accounts cannot be deleted here.");
  }
  await db.user.delete({ where: { id } });
  return ok({ deleted: true });
});