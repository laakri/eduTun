import { z } from "zod";

import { requireUser } from "@/core/auth.service";
import { hasCourseAccess } from "@/lib/content-access";
import { db } from "@/lib/db";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { ok, withErrorHandler } from "@/lib/api-response";

export const GET = withErrorHandler(async (request) => {
  const user = await requireUser();
  const courseId = z.string().min(1).parse(
    new URL(request.url).searchParams.get("courseId"),
  );
  const course = await db.course.findUnique({
    where: { id: courseId },
    select: { id: true, published: true },
  });

  if (!course) throw new NotFoundError("Course");
  if (!course.published || !(await hasCourseAccess(user.id, courseId))) {
    throw new ForbiddenError("Your access to this course has expired or is unavailable.");
  }

  return ok({ allowed: true });
});