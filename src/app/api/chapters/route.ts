import { z } from "zod";
import { VideoStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { ok, withErrorHandler } from "@/lib/api-response";
import { parseBody } from "@/lib/parse-body";
import { assertCanEditCourse } from "@/core/auth.service";
import { NotFoundError } from "@/lib/errors";
import { reserveBunnyVideo, getTusUploadCredentials } from "@/lib/bunny";

const createChapterSchema = z.object({
  courseId: z.string().cuid(),
  title: z.string().min(1),
  description: z.string().max(2_000).optional(),
  order: z.number().int().min(0),
});

export const POST = withErrorHandler(async (req) => {
  const body = await parseBody(req, createChapterSchema);

  const course = await db.course.findUnique({ where: { id: body.courseId } });
  if (!course) throw new NotFoundError("Course");
  await assertCanEditCourse(course);

  const videoId = await reserveBunnyVideo(body.title);

  const chapter = await db.chapter.create({
    data: {
      courseId: body.courseId,
      title: body.title,
      description: body.description?.trim() || null,
      order: body.order,
      videoProvider: "bunny",
      videoId,
      videoStatus: VideoStatus.PROCESSING,
    },
  });

  const uploadCredentials = getTusUploadCredentials(videoId);

  return ok({ chapterId: chapter.id, videoId, uploadCredentials }, 201);
});
