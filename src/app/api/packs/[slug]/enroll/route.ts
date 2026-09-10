import { requireUser } from "@/core/auth.service";
import { db } from "@/lib/db";
import { NotFoundError } from "@/lib/errors";
import { ok, withErrorHandler } from "@/lib/api-response";

export const POST = withErrorHandler(
  async (_req, { params }: { params: Promise<{ slug: string }> }) => {
    const user = await requireUser();
    const { slug } = await params;
    const pack = await db.pack.findUnique({ where: { slug } });

    if (!pack) throw new NotFoundError("Pack");
    const enrollment = await db.packEnrollment.upsert({
      where: { userId_packId: { userId: user.id, packId: pack.id } },
      // Payment is simulated for now. Replace this endpoint's grant with the
      // payment-provider confirmation once checkout is connected.
      update: { status: "active", source: "payment" },
      create: {
        userId: user.id,
        packId: pack.id,
        source: "payment",
      },
    });

    return ok(enrollment, 201);
  },
);
