import { assertCanEditCourse } from "@/core/auth.service";
import { db } from "@/lib/db";
import { ok, withErrorHandler } from "@/lib/api-response";
import { deleteBunnyVideo, deleteFromBunnyStorage } from "@/lib/bunny";
import { NotFoundError } from "@/lib/errors";

async function cleanupChapter(id: string) {
  const chapter = await db.chapter.findUnique({
    where: { id },
    include: { course: true, resources: true },
  });

  if (!chapter) throw new NotFoundError("Chapter");
  await assertCanEditCourse(chapter.course);

  if (chapter.videoProvider === "bunny" && chapter.videoId) {
    await deleteBunnyVideo(chapter.videoId);
  }

  for (const resource of chapter.resources) {
    await deleteFromBunnyStorage(resource.storageKey);
  }

  await db.chapter.delete({ where: { id } });
  return ok({ deleted: true });
}

export const DELETE = withErrorHandler(
  async (_req, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    return cleanupChapter(id);
  },
);

export const POST = withErrorHandler(
  async (_req, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    return cleanupChapter(id);
  },
);
