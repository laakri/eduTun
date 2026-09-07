import { z } from "zod";

import { requireUser } from "@/core/auth.service";
import { canEditCourse } from "@/core/permissions";
import { hasCourseAccess } from "@/lib/content-access";
import { db } from "@/lib/db";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { ok, withErrorHandler } from "@/lib/api-response";
import { getBunnyHlsUrl } from "@/lib/bunny";

export const GET = withErrorHandler(async (req) => {
  const user = await requireUser();
  const courseId = z.string().cuid().parse(new URL(req.url).searchParams.get("courseId"));
  const course = await db.course.findUnique({ where: { id: courseId }, include: { chapters: { orderBy: { order: "asc" }, include: { sections: { orderBy: { order: "asc" } }, resources: { orderBy: { order: "asc" } } } } } });
  if (!course) throw new NotFoundError("Course");
  const canEdit = canEditCourse(user, course);
  if (!canEdit && (!course.published || !(await hasCourseAccess(user.id, course.id)))) throw new ForbiddenError("Unlock this pack to view its lessons.");
  return ok({ id: course.id, title: course.title, description: course.description, canEdit, chapters: course.chapters.map((chapter) => ({ id: chapter.id, title: chapter.title, description: chapter.description, order: chapter.order, durationSeconds: chapter.durationSeconds, videoProvider: chapter.videoProvider, playbackUrl: chapter.videoProvider === "bunny" ? getBunnyHlsUrl(chapter.videoId) : null, sections: chapter.sections, resources: chapter.resources.map((resource) => ({ id: resource.id, title: resource.title, sizeBytes: resource.sizeBytes })) })) });
});
