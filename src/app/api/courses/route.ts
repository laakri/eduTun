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
  categoryId: z.string().cuid().optional(),
  categoryIds: z.array(z.string().cuid()).min(1).optional(),
}).refine((body) => body.categoryIds?.length || body.categoryId, {
  message: "Choose at least one specific subject.",
  path: ["categoryIds"],
});

export const POST = withErrorHandler(async (req) => {
  const user = await requireCourseManager();
  const body = await parseBody(req, createCourseSchema);
  const categoryIds = [...new Set(body.categoryIds ?? (body.categoryId ? [body.categoryId] : []))];
  const categories = await db.category.findMany({
    where: { id: { in: categoryIds } },
    select: { id: true, childLinks: { select: { childId: true } } },
  });

  if (categories.length !== categoryIds.length) {
    throw new ValidationError("Choose valid subjects.");
  }
  if (categories.some((category) => category.childLinks.length > 0)) {
    throw new ValidationError(
      "Choose specific subjects, not parent programs.",
    );
  }

  const course = await db.course.create({
    data: {
      title: body.title,
      description: body.description ?? null,
      profId: user.id,
      categories: { create: categoryIds.map((categoryId) => ({ categoryId })) },
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
