import { z } from "zod";
import { VideoStatus } from "@prisma/client";
import { assertCanEditCourse } from "@/core/auth.service";
import { db } from "@/lib/db";
import { ok, withErrorHandler } from "@/lib/api-response";
import { deleteBunnyVideo, deleteFromBunnyStorage, getBunnyVideoStatus } from "@/lib/bunny";
import { NotFoundError, ValidationError } from "@/lib/errors";

const updateChapterSchema = z.object({
  title: z.string().min(1).max(160).optional(),
  description: z.string().max(2000).nullable().optional(),
  published: z.boolean().optional(),
}).refine(
  (body) => body.title !== undefined || body.description !== undefined || body.published !== undefined,
  { message: "At least one chapter field is required." },
);

export const PATCH = withErrorHandler(
  async (req, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const chapter = await db.chapter.findUnique({
      where: { id },
      include: { course: true },
    });

    if (!chapter) throw new NotFoundError("Chapter");
    await assertCanEditCourse(chapter.course);

    const body = updateChapterSchema.parse(await req.json());
    if (body.published === true) {
      let status;
      try {
        status = await getBunnyVideoStatus(chapter.videoId);
      } catch {
        throw new ValidationError("Could not verify the Bunny video. Try again shortly.");
      }

      const videoStatus = status.failed
        ? VideoStatus.FAILED
        : status.ready
          ? VideoStatus.READY
          : VideoStatus.PROCESSING;

      await db.chapter.update({
        where: { id },
        data: { videoStatus },
      });

      if (videoStatus !== VideoStatus.READY) {
        throw new ValidationError(
          videoStatus === VideoStatus.FAILED
            ? `Video processing failed for "${chapter.title}".`
            : `Video "${chapter.title}" is still being processed.`,
        );
      }
    }

    return ok(
      await db.chapter.update({
        where: { id },
        data: {
          ...(body.title !== undefined ? { title: body.title } : {}),
          ...(body.description !== undefined ? { description: body.description } : {}),
          ...(body.published !== undefined ? { published: body.published } : {}),
        },
        select: { id: true, title: true, description: true, published: true },
      }),
    );
  },
);

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
