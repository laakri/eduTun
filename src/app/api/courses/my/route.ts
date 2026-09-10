import { db } from "@/lib/db";
import { ok, withErrorHandler } from "@/lib/api-response";
import { requireCourseManager } from "@/core/auth.service";
import { getBunnyCdnUrl } from "@/lib/bunny";

export const GET = withErrorHandler(async () => {
  const user = await requireCourseManager();

  const courses = await db.course.findMany({
    where: {
      profId: user.id,
    },
    include: {
      chapters: {
        where: { videoStatus: "READY" },
        orderBy: {
          order: "asc",
        },
      },
      categories: {
        include: {
          category: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return ok(
    courses.map((course) => ({
      ...course,
      coverImageUrl: course.coverImageKey
        ? safeCdnUrl(course.coverImageKey)
        : null,
      canEdit: true,
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
