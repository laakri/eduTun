import { z } from "zod";

import { requireRole } from "@/core/auth.service";
import { ConflictError, NotFoundError } from "@/lib/errors";
import { db } from "@/lib/db";
import { ok, withErrorHandler } from "@/lib/api-response";
import { parseBody } from "@/lib/parse-body";
import { sendAccessApprovedEmail } from "@/lib/access-approved-email";

const decisionSchema = z.object({
  decision: z.enum(["approved", "rejected"]),
  reviewNote: z.string().max(1_000).optional(),
});

export const PATCH = withErrorHandler(
  async (req, { params }: { params: Promise<{ id: string }> }) => {
    const admin = await requireRole("admin");
    const { id } = await params;
    const input = await parseBody(req, decisionSchema);
    const request = await db.bacAccessRequest.findUnique({
      where: { id },
      include: {
        user: { select: { email: true, fullName: true } },
        plan: { select: { name: true } },
        bacType: { select: { name: true } },
      },
    });

    if (!request) throw new NotFoundError("Bac access request");
    if (request.status !== "pending") {
      throw new ConflictError("This Bac access request has already been reviewed.");
    }

    const result = await db.$transaction(async (tx) => {
      const startedAt = new Date();
      const expiresAt = new Date(startedAt);
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
      const reviewed = await tx.bacAccessRequest.update({
        where: { id },
        data: {
          status: input.decision,
          reviewNote: input.reviewNote?.trim() || null,
          reviewedById: admin.id,
          reviewedAt: new Date(),
        },
      });

      if (input.decision === "approved") {
        await tx.userSubscription.create({
          data: {
            userId: request.userId,
            planId: request.planId,
            bacTypeId: request.bacTypeId,
            accessRequestId: request.id,
            billingCycle: "year",
            status: "active",
            startedAt,
            expiresAt,
          },
        });
      }

      return { reviewed, startedAt, expiresAt };
    });

    let emailDelivered = false;
    if (input.decision === "approved") {
      try {
        await sendAccessApprovedEmail({
          email: request.user.email,
          fullName: request.user.fullName,
          planName: request.plan.name,
          bacTypeName: request.bacType.name,
          startedAt: result.startedAt,
          expiresAt: result.expiresAt,
        });
        emailDelivered = true;
      } catch (error) {
        console.error("Bac access approved but notification email failed", error);
      }
    }

    return ok({ ...result.reviewed, emailDelivered });
  },
);
