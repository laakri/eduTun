import { z } from "zod";

import { requireUser } from "@/core/auth.service";
import { hasCourseAccess } from "@/lib/content-access";
import { db } from "@/lib/db";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { ok, withErrorHandler } from "@/lib/api-response";

const progressSchema = z.object({
  chapterId: z.string().cuid(),
  watchedSeconds: z.number().int().min(0).max(86_400),
  completed: z.boolean().optional(),
});

export const POST = withErrorHandler(async (request) => {
  const user = await requireUser();
  const body = progressSchema.parse(await request.json());
  const chapter = await db.chapter.findUnique({
    where: { id: body.chapterId },
    select: { id: true, courseId: true, published: true, course: { select: { published: true } } },
  });

  if (!chapter) throw new NotFoundError("Chapter");
  if (!chapter.course.published || !chapter.published || !(await hasCourseAccess(user.id, chapter.courseId))) {
    throw new ForbiddenError("You cannot save progress for this lesson.");
  }

  const progress = await db.videoProgress.upsert({
    where: { userId_chapterId: { userId: user.id, chapterId: body.chapterId } },
    create: {
      userId: user.id,
      chapterId: body.chapterId,
      watchedSeconds: body.watchedSeconds,
      completed: body.completed ?? false,
    },
    update: {
      watchedSeconds: body.watchedSeconds,
      ...(body.completed !== undefined ? { completed: body.completed } : {}),
    },
    select: { watchedSeconds: true, completed: true, updatedAt: true },
  });

  return ok(progress);
});