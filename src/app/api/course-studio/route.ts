import { z } from "zod";
import { VideoStatus } from "@prisma/client";
import { assertCanEditCourse } from "@/core/auth.service";
import { db } from "@/lib/db";
import { NotFoundError } from "@/lib/errors";
import { ok, withErrorHandler } from "@/lib/api-response";
import { getBunnyVideoStatus } from "@/lib/bunny";

export const GET = withErrorHandler(async (req) => {
  const id = z
    .string()
    .cuid()
    .parse(new URL(req.url).searchParams.get("courseId"));
  const course = await db.course.findUnique({
    where: { id },
    include: {
      chapters: {
        orderBy: { order: "asc" },
        include: { sections: true, resources: true },
      },
    },
  });
  if (!course) throw new NotFoundError("Course");
  await assertCanEditCourse(course);
  const coverImageUrl = course.coverImageKey
    ? `/api/media?key=${encodeURIComponent(course.coverImageKey)}`
    : null;
  return ok({
    ...course,
    coverImageUrl,
    chapters: await Promise.all(
      course.chapters.map(async (chapter) => {
        const video = await getBunnyVideoStatus(chapter.videoId).catch(
          () => null,
        );
        const videoStatus = video?.failed
          ? VideoStatus.FAILED
          : video?.ready
            ? VideoStatus.READY
            : VideoStatus.PROCESSING;
        await db.chapter.update({
          where: { id: chapter.id },
          data: { videoStatus, ready: videoStatus === VideoStatus.READY },
        });
        return {
          ...chapter,
          videoStatus,
          thumbnailUrl: video?.thumbnailUrl
            ? `/api/video-thumbnail?videoId=${chapter.videoId}`
            : null,
          status: videoStatus.toLowerCase(),
        };
      }),
    ),
  });
});
