import { db } from "@/lib/db";
import { ok, withErrorHandler } from "@/lib/api-response";
import { assertCanEditCourse } from "@/core/auth.service";
import { VideoStatus } from "@prisma/client";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { getBunnyVideoStatus } from "@/lib/bunny";

export const POST = withErrorHandler(
  async (_req, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;

    const course = await db.course.findUnique({
      where: { id },
      include: { chapters: true },
    });

    if (!course) throw new NotFoundError("Course");
    await assertCanEditCourse(course);

    if (course.chapters.length === 0) {
      throw new ValidationError("Add at least one chapter before publishing.");
    }

    await Promise.all(
      course.chapters.map(async (chapter) => {
        const bunny = await getBunnyVideoStatus(chapter.videoId);
        const videoStatus = bunny.failed
          ? VideoStatus.FAILED
          : bunny.ready
            ? VideoStatus.READY
            : VideoStatus.PROCESSING;
        await db.chapter.update({
          where: { id: chapter.id },
          data: {
            videoStatus,
            ready: videoStatus === VideoStatus.READY,
            ...(bunny.durationSeconds
              ? { durationSeconds: bunny.durationSeconds }
              : {}),
          },
        });
        chapter.videoStatus = videoStatus;
      }),
    );

    const blockedChapter = course.chapters.find(
      (chapter) => chapter.videoStatus !== VideoStatus.READY,
    );
    if (blockedChapter) {
      throw new ValidationError(
        blockedChapter.videoStatus === VideoStatus.FAILED
          ? `Video processing failed for "${blockedChapter.title}". Re-upload the video before publishing.`
          : `Video "${blockedChapter.title}" is still being processed. You can publish the course once processing is complete.`,
      );
    }

    const publishedCourse = await db.course.update({
      where: { id },
      data: { published: true },
    });

    return ok(publishedCourse);
  },
);
