import { z } from "zod";
import { db } from "@/lib/db";
import { ok, withErrorHandler } from "@/lib/api-response";
import { parseBody } from "@/lib/parse-body";
import { requireCourseManager, requireUser } from "@/core/auth.service";
import { canManageCourses } from "@/core/permissions";
import { getBunnyCdnUrl } from "@/lib/bunny";
import { ValidationError } from "@/lib/errors";

const createCourseSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  categoryId: z.string().cuid(),
});

export const POST = withErrorHandler(async (req) => {
  const user = await requireCourseManager();
  const body = await parseBody(req, createCourseSchema);
  const category = await db.category.findUnique({
    where: { id: body.categoryId },
    select: { id: true, parentId: true, children: { select: { id: true } } },
  });

  if (!category) throw new ValidationError("Choose a valid subject.");
  if (category.children.length > 0) {
    throw new ValidationError(
      "Choose a specific subject, not a parent program.",
    );
  }

  const course = await db.course.create({
    data: {
      title: body.title,
      description: body.description ?? null,
      profId: user.id,
      categories: { create: [{ categoryId: body.categoryId }] },
    },
    include: {
      categories: { include: { category: true } },
      chapters: true,
    },
  });

  return ok(course, 201);
});

export const GET = withErrorHandler(async () => {
  const user = await requireUser();
  const manager = canManageCourses(user.roles);
  const isAdmin = user.roles.includes("admin");

  const courses = await db.course.findMany({
    ...(manager
      ? isAdmin
        ? {}
        : { where: { profId: user.id } }
      : { where: { published: true } }),
    include: {
      chapters: { orderBy: { order: "asc" } },
      categories: { include: { category: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return ok(
    courses.map((course) => ({
      ...course,
      coverImageUrl: course.coverImageKey
        ? safeCdnUrl(course.coverImageKey)
        : null,
      canEdit: manager && (isAdmin || course.profId === user.id),
    })),
  );
});

function safeCdnUrl(storageKey: string) {
  try {
    return getBunnyCdnUrl(storageKey);
  } catch {
    return null;
  }
}
