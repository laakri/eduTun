import { db } from "@/lib/db";
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

    if (
      status.ready &&
      status.durationSeconds &&
      chapter.durationSeconds !== status.durationSeconds
    ) {
      await db.chapter.update({
        where: { id },
        data: { durationSeconds: status.durationSeconds, ready: true },
      });
    }

    return ok(status);
  },
);
