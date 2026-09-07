import { z } from "zod";

import { requireRole } from "@/core/auth.service";
import { ConflictError, NotFoundError } from "@/lib/errors";
import { ok, withErrorHandler } from "@/lib/api-response";
import { parseBody } from "@/lib/parse-body";
import { db } from "@/lib/db";

const decisionSchema = z.object({
  decision: z.enum(["approved", "rejected"]),
  reviewNote: z.string().max(1_000).optional(),
});

export const PATCH = withErrorHandler(
  async (req, { params }: { params: Promise<{ id: string }> }) => {
    const admin = await requireRole("admin");
    const { id } = await params;
    const input = await parseBody(req, decisionSchema);

    const application = await db.profApplication.findUnique({ where: { id } });
    if (!application) throw new NotFoundError("Professor application");
    if (application.status !== "pending") {
      throw new ConflictError("This application has already been reviewed.");
    }

    const result = await db.$transaction(async (tx) => {
      const updated = await tx.profApplication.update({
        where: { id },
        data: {
          status: input.decision,
          reviewNote: input.reviewNote?.trim() || null,
          reviewedById: admin.id,
          reviewedAt: new Date(),
        },
      });

      if (input.decision === "approved") {
        const profRole = await tx.role.upsert({
          where: { slug: "prof" },
          update: {},
          create: { slug: "prof", displayName: "Professor" },
        });
        await tx.userRole.upsert({
          where: { userId_roleId: { userId: application.applicantId, roleId: profRole.id } },
          update: {},
          create: { userId: application.applicantId, roleId: profRole.id },
        });
      }
      return updated;
    });
    return ok(result);
  },
);
