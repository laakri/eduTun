import { db } from "@/lib/db";
import { VideoStatus } from "@prisma/client";
import { ok, withErrorHandler } from "@/lib/api-response";
import { assertCanEditCourse } from "@/core/auth.service";
import { NotFoundError } from "@/lib/errors";
import { getBunnyVideoStatus } from "@/lib/bunny";

export const GET = withErrorHandler(
  async (_req, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;

    const chapter = await db.chapter.findUnique({
      where: { id },
      include: { course: true },
    });

    if (!chapter) throw new NotFoundError("Chapter");
    await assertCanEditCourse(chapter.course);

    const status = await getBunnyVideoStatus(chapter.videoId);
    const videoStatus = status.failed
      ? VideoStatus.FAILED
      : status.ready
        ? VideoStatus.READY
        : VideoStatus.PROCESSING;

    await db.chapter.update({
      where: { id },
      data: {
        videoStatus,
        ...(status.durationSeconds
          ? { durationSeconds: status.durationSeconds }
          : {}),
      },
    });

    return ok({
      ...status,
      id: chapter.id,
      bunnyVideoId: chapter.videoId,
      videoStatus,
      progress: status.ready ? 100 : status.encodeProgress,
    });
  },
);
