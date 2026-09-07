import { db } from "@/lib/db";
import { ok, withErrorHandler } from "@/lib/api-response";
import { assertCanEditCourse } from "@/core/auth.service";
import { NotFoundError, ValidationError } from "@/lib/errors";

export const POST = withErrorHandler(
  async (_req, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;

    const course = await db.course.findUnique({
      where: { id },
      include: { chapters: true },
    });

    if (!course) throw new NotFoundError("Course");
    await assertCanEditCourse(course);

    if (course.chapters.length === 0) {
      throw new ValidationError("Add at least one chapter before publishing.");
    }

    const publishedCourse = await db.course.update({
      where: { id },
      data: { published: true },
    });

    return ok(publishedCourse);
  },
);
