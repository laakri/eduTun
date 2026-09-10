import { z } from "zod";
import { VideoStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { ok, withErrorHandler } from "@/lib/api-response";
import { parseBody } from "@/lib/parse-body";
import { assertCanEditCourse, requireCourseManager } from "@/core/auth.service";
import { NotFoundError, ValidationError } from "@/lib/errors";
import {
  getBunnyCdnUrl,
  getBunnyEmbedUrl,
  deleteBunnyVideo,
  deleteFromBunnyStorage,
} from "@/lib/bunny";

const courseInclude = {
  categories: { include: { category: true } },
  chapters: {
    orderBy: { order: "asc" as const },
    include: {
      sections: { orderBy: { order: "asc" as const } },
      resources: { orderBy: { order: "asc" as const } },
    },
  },
};

const updateCourseSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  categoryIds: z.array(z.string().cuid()).min(1).optional(),
  published: z.boolean().optional(),
});

export const GET = withErrorHandler(
  async (_req, { params }: { params: Promise<{ id: string }> }) => {
    await requireCourseManager();

    const { id } = await params;

    const course = await db.course.findUnique({
      where: { id },
      include: courseInclude,
    });

    if (!course) {
      throw new NotFoundError("Course");
    }

    await assertCanEditCourse(course);

    const coverImageUrl = course.coverImageKey
      ? safeCdnUrl(course.coverImageKey)
      : null;

    return ok({
      ...course,
      coverImageUrl,
      chapters: course.chapters.map((chapter) => ({
        ...chapter,
        embedUrl:
          chapter.videoProvider === "bunny"
            ? getBunnyEmbedUrl(chapter.videoId)
            : null,
        resources: chapter.resources.map((resource) => ({
          ...resource,
          url: safeCdnUrl(resource.storageKey),
        })),
      })),
    });
  },
);

export const PATCH = withErrorHandler(
  async (req, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;

    const existing = await db.course.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundError("Course");
    }

    await assertCanEditCourse(existing);

    const body = await parseBody(req, updateCourseSchema);

    if (body.published === true) {
      const chapters = await db.chapter.findMany({
        where: { courseId: id },
        select: { title: true, videoStatus: true },
      });
      if (chapters.length === 0) {
        throw new NotFoundError("Chapter");
      }
      const blockedChapter = chapters.find(
        (chapter) => chapter.videoStatus !== VideoStatus.READY,
      );
      if (blockedChapter) {
        throw new ValidationError(
          blockedChapter.videoStatus === VideoStatus.FAILED
            ? `Video processing failed for "${blockedChapter.title}".`
            : `Video "${blockedChapter.title}" is still being processed.`,
        );
      }
    }

    const course = await db.$transaction(async (tx) => {
      if (body.categoryIds) {
        await tx.courseCategory.deleteMany({
          where: { courseId: id },
        });

        await tx.courseCategory.createMany({
          data: body.categoryIds.map((categoryId) => ({
            courseId: id,
            categoryId,
          })),
        });
      }

      return tx.course.update({
        where: { id },
        data: {
          ...(body.title !== undefined ? { title: body.title } : {}),

          ...(body.description !== undefined
            ? { description: body.description }
            : {}),

          ...(body.published !== undefined
            ? { published: body.published }
            : {}),
        },
        include: courseInclude,
      });
    });

    return ok(course);
  },
);

export const DELETE = withErrorHandler(
  async (_req, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;

    const course = await db.course.findUnique({
      where: { id },
      select: {
        id: true,
        profId: true,
        coverImageKey: true,
        chapters: {
          select: {
            id: true,
            videoProvider: true,
            videoId: true,
            resources: {
              select: {
                storageKey: true,
              },
            },
          },
        },
      },
    });

    if (!course) {
      throw new NotFoundError("Course");
    }

    await assertCanEditCourse(course);

    // Delete course cover from Bunny Storage
    if (course.coverImageKey) {
      await deleteFromBunnyStorage(course.coverImageKey);
    }

    // Delete chapter videos and resources
    for (const chapter of course.chapters) {
      // Delete Bunny video
      if (chapter.videoProvider === "bunny" && chapter.videoId) {
        await deleteBunnyVideo(chapter.videoId);
      }

      // Delete chapter resources from Bunny Storage
      for (const resource of chapter.resources) {
        if (resource.storageKey) {
          await deleteFromBunnyStorage(resource.storageKey);
        }
      }
    }

    // Delete course and all related DB records
    // Prisma cascade rules handle chapters, sections,
    // resources, progress, quizzes, categories, tags, etc.
    await db.course.delete({
      where: { id },
    });

    return ok({
      message: "Course and all associated content deleted successfully",
    });
  },
);

function safeCdnUrl(storageKey: string) {
  try {
    return getBunnyCdnUrl(storageKey);
  } catch {
    return null;
  }
}
