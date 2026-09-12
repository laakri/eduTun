import { requireCourseManager, requireUser } from "@/core/auth.service";
import { db } from "@/lib/db";
import { ForbiddenError } from "@/lib/errors";
import { ok, withErrorHandler } from "@/lib/api-response";

function collectDescendants(
  rootId: string,
  categoryLinks: Array<{ parentId: string; childId: string }>,
) {
  const ids = new Set<string>([rootId]);
  let changed = true;

  while (changed) {
    changed = false;
    for (const link of categoryLinks) {
      if (ids.has(link.parentId) && !ids.has(link.childId)) {
        ids.add(link.childId);
        changed = true;
      }
    }
  }

  return ids;
}

export const GET = withErrorHandler(async () => {
  const user = await requireUser();
  await requireCourseManager();

  if (user.roles.includes("admin")) {
    throw new ForbiddenError(
      "Student enrollment lists are available from professor courses.",
    );
  }

  const courses = await db.course.findMany({
    where: { profId: user.id },
    select: { categories: { select: { categoryId: true } } },
  });

  const courseCategoryIds = new Set(
    courses.flatMap((course) => course.categories.map(({ categoryId }) => categoryId)),
  );

  if (courseCategoryIds.size === 0) return ok({ students: [] });

  const categories = await db.categoryRelation.findMany({
    select: { parentId: true, childId: true },
  });

  const coveredCategoryIds = new Set<string>();
  for (const category of await db.category.findMany({ select: { id: true } })) {
    const descendants = collectDescendants(category.id, categories);
    if ([...descendants].some((id) => courseCategoryIds.has(id))) {
      coveredCategoryIds.add(category.id);
    }
  }

  const subscriptions = await db.userSubscription.findMany({
    where: {
      status: "active",
      expiresAt: { gt: new Date() },
      plan: { domainId: { in: [...coveredCategoryIds] } },
      user: { roles: { some: { role: { slug: "student" } } } },
    },
    orderBy: { expiresAt: "asc" },
    select: {
      expiresAt: true,
      billingCycle: true,
      plan: { select: { id: true, name: true, domain: { select: { name: true } } } },
      user: { select: { id: true, fullName: true, email: true, avatarUrl: true } },
    },
  });

  const students = new Map<string, {
    id: string;
    fullName: string;
    email: string;
    avatarUrl: string | null;
    subscriptions: Array<{ planId: string; planName: string; domainName: string; billingCycle: string; expiresAt: Date }>;
  }>();

  for (const subscription of subscriptions) {
    const current = students.get(subscription.user.id) ?? {
      ...subscription.user,
      subscriptions: [],
    };
    current.subscriptions.push({
      planId: subscription.plan.id,
      planName: subscription.plan.name,
      domainName: subscription.plan.domain.name,
      billingCycle: subscription.billingCycle,
      expiresAt: subscription.expiresAt,
    });
    students.set(subscription.user.id, current);
  }

  const progress = await db.videoProgress.findMany({
    where: {
      userId: { in: [...students.keys()] },
      chapter: { course: { profId: user.id } },
    },
    select: {
      userId: true,
      completed: true,
      updatedAt: true,
      chapter: { select: { courseId: true, course: { select: { title: true } } } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const progressByStudent = new Map<string, { completed: number; started: number; lastActivity: Date | null; courses: Map<string, { title: string; completed: number; started: number }> }>();
  for (const item of progress) {
    const current = progressByStudent.get(item.userId) ?? { completed: 0, started: 0, lastActivity: null, courses: new Map() };
    current.started += 1;
    if (item.completed) current.completed += 1;
    if (!current.lastActivity || item.updatedAt > current.lastActivity) current.lastActivity = item.updatedAt;
    const course = current.courses.get(item.chapter.courseId) ?? { title: item.chapter.course.title, completed: 0, started: 0 };
    course.started += 1;
    if (item.completed) course.completed += 1;
    current.courses.set(item.chapter.courseId, course);
    progressByStudent.set(item.userId, current);
  }

  const studentsWithProgress = [...students.values()].map((student) => {
    const current = progressByStudent.get(student.id);
    return {
      ...student,
      progress: {
        completedChapters: current?.completed ?? 0,
        startedChapters: current?.started ?? 0,
        lastActivity: current?.lastActivity,
        courses: current ? [...current.courses.values()] : [],
      },
    };
  });

  return ok({ students: studentsWithProgress });
});