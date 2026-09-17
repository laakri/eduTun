import { requireRole } from "@/core/auth.service";
import { db } from "@/lib/db";
import { ok, withErrorHandler } from "@/lib/api-response";

export const DELETE = withErrorHandler(async (_request, { params }: { params: Promise<{ id: string }> }) => {
  await requireRole("admin");
  const { id } = await params;
  const application = await db.profApplication.findUnique({ where: { id }, select: { status: true } });
  if (!application) throw new Error("Application not found.");
  if (application.status === "pending") throw new Error("Pending applications cannot be deleted.");
  await db.profApplication.delete({ where: { id } });
  return ok({ deleted: true });
});