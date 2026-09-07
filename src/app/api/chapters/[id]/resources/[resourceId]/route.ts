import { db } from "@/lib/db";
import { ok, withErrorHandler } from "@/lib/api-response";
import { assertCanEditCourse } from "@/core/auth.service";
import { NotFoundError } from "@/lib/errors";
import { deleteFromBunnyStorage } from "@/lib/bunny";

export const DELETE = withErrorHandler(
  async (
    _req,
    {
      params,
    }: { params: Promise<{ id: string; resourceId: string }> },
  ) => {
    const { id, resourceId } = await params;

    const resource = await db.chapterResource.findUnique({
      where: { id: resourceId },
      include: { chapter: { include: { course: true } } },
    });

    if (!resource || resource.chapterId !== id) {
      throw new NotFoundError("Resource");
    }

    await assertCanEditCourse(resource.chapter.course);

    try {
      await deleteFromBunnyStorage(resource.storageKey);
    } catch {
      // DB row still removed so the studio stays consistent.
    }

    await db.chapterResource.delete({ where: { id: resourceId } });
    return ok({ deleted: true });
  },
);
