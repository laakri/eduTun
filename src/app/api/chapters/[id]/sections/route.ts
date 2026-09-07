import { z } from "zod";
import { db } from "@/lib/db";
import { ok, withErrorHandler } from "@/lib/api-response";
import { parseBody } from "@/lib/parse-body";
import { assertCanEditCourse } from "@/core/auth.service";
import { NotFoundError, ValidationError } from "@/lib/errors";

const sectionSchema = z.object({
  title: z.string().min(1),
  startSeconds: z.number().int().min(0),
  endSeconds: z.number().int().min(1),
  order: z.number().int().min(0),
});

const replaceSectionsSchema = z.object({
  sections: z.array(sectionSchema),
});

export const PUT = withErrorHandler(
  async (req, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const body = await parseBody(req, replaceSectionsSchema);

    for (const section of body.sections) {
      if (section.endSeconds <= section.startSeconds) {
        throw new ValidationError(
          `"${section.title}" must end after it starts.`,
        );
      }
    }

    const chapter = await db.chapter.findUnique({
      where: { id },
      include: { course: true },
    });

    if (!chapter) throw new NotFoundError("Chapter");
    await assertCanEditCourse(chapter.course);

    const sections = await db.$transaction(async (tx) => {
      await tx.videoSection.deleteMany({ where: { chapterId: id } });
      if (body.sections.length === 0) return [];

      await tx.videoSection.createMany({
        data: body.sections.map((section) => ({
          chapterId: id,
          title: section.title,
          startSeconds: section.startSeconds,
          endSeconds: section.endSeconds,
          order: section.order,
        })),
      });

      return tx.videoSection.findMany({
        where: { chapterId: id },
        orderBy: { order: "asc" },
      });
    });

    // Do not mutate Bunny's video record during or directly after a TUS
    // upload. Bunny may still be finalizing the file, and a concurrent video
    // update can reject the request or interfere with that handoff. EduTun's
    // player reads these rows directly, so timestamp navigation works now.
    // Bunny-hosted marker mirroring can be a separate, retryable job later.
    return ok({ sections, bunnySyncPending: false });
  },
);
