import { z } from "zod";
import { requireUser } from "@/core/auth.service";
import { db } from "@/lib/db";
import { NotFoundError, ForbiddenError } from "@/lib/errors";
import { ok, withErrorHandler } from "@/lib/api-response";
import { canEditCourse } from "@/core/permissions";
import { hasCourseAccess } from "@/lib/content-access";

const updateCommentSchema = z.object({
  body: z.string().trim().min(1).max(1000),
});

async function getEditableComment(id: string) {
  const user = await requireUser();
  const comment = await db.chapterComment.findUnique({
    where: { id },
    include: { chapter: { include: { course: true } } },
  });

  if (!comment) throw new NotFoundError("Comment");

  const canManage = comment.userId === user.id || user.roles.includes("admin");
  if (!canManage) throw new ForbiddenError("You can only manage your own comments.");

  if (
    !canEditCourse(user, comment.chapter.course) &&
    (!comment.chapter.published ||
      !comment.chapter.course.published ||
      !(await hasCourseAccess(user.id, comment.chapter.courseId)))
  ) {
    throw new ForbiddenError("Your access to this course has expired or is unavailable.");
  }

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