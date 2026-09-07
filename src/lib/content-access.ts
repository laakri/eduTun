import { db } from "@/lib/db";

/** A pack can grant one course directly or an entire category subtree. */
export async function hasCourseAccess(userId: string, courseId: string) {
  const [course, enrollments] = await Promise.all([
    db.course.findUnique({ where: { id: courseId }, select: { categories: { select: { categoryId: true } } } }),
    db.packEnrollment.findMany({ where: { userId, status: "active" }, select: { pack: { select: { items: { select: { courseId: true, categoryId: true } } } } } }),
  ]);
  if (!course) return false;
  const courseIds = new Set<string>();
  const categoryIds = new Set<string>();
  for (const enrollment of enrollments) for (const item of enrollment.pack.items) {
    if (item.courseId) courseIds.add(item.courseId);
    if (item.categoryId) categoryIds.add(item.categoryId);
  }
  if (courseIds.has(courseId)) return true;
  for (const { categoryId } of course.categories) {
    let currentId: string | null = categoryId;
    const visited = new Set<string>();
    while (currentId && !visited.has(currentId)) {
      if (categoryIds.has(currentId)) return true;
      visited.add(currentId);
      const category: { parentId: string | null } | null = await db.category.findUnique({ where: { id: currentId }, select: { parentId: true } });
      currentId = category?.parentId ?? null;
    }
  }
  return false;
}
