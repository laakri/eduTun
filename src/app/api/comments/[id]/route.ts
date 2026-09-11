import { z } from "zod";
import { requireUser } from "@/core/auth.service";
import { db } from "@/lib/db";
import { NotFoundError, ForbiddenError } from "@/lib/errors";
import { ok, withErrorHandler } from "@/lib/api-response";

const updateCommentSchema = z.object({
  body: z.string().trim().min(1).max(1000),
});

async function getEditableComment(id: string) {
  const user = await requireUser();
  const comment = await db.chapterComment.findUnique({ where: { id } });

  if (!comment) throw new NotFoundError("Comment");

  const canManage = comment.userId === user.id || user.roles.includes("admin");
  if (!canManage) throw new ForbiddenError("You can only manage your own comments.");

  return comment;
}

export const PATCH = withErrorHandler(
  async (req, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    await getEditableComment(id);
    const body = updateCommentSchema.parse(await req.json());

    const comment = await db.chapterComment.update({
      where: { id },
      data: { body: body.body },
      include: { user: { select: { fullName: true, avatarUrl: true } } },
    });

    return ok({
      comment: {
        ...comment,
        editedAt: comment.updatedAt,
        canEdit: true,
      },
    });
  },
);

export const DELETE = withErrorHandler(
  async (_req, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    await getEditableComment(id);

    await db.chapterComment.delete({ where: { id } });
    return ok({ ok: true });
  },
);