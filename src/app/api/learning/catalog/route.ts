import { requireUser } from "@/core/auth.service";
import { db } from "@/lib/db";
import { ok, withErrorHandler } from "@/lib/api-response";

function collectDescendantCategoryIds(
  domainId: string,
  categoryLinks: Array<{ parentId: string; childId: string }>,
) {
  const ids = new Set<string>();
  const stack = [domainId];

  while (stack.length > 0) {
    const currentId = stack.pop();
    if (!currentId || ids.has(currentId)) continue;
    ids.add(currentId);

    for (const link of categoryLinks) {
      if (link.parentId === currentId) {
        stack.push(link.childId);
      }
    }
  }

  return ids;
}

export const GET = withErrorHandler(async (req) => {
  const user = await requireUser();
  const searchParams = new URL(req.url).searchParams;
  const categoryId = searchParams.get("categoryId")?.trim() || null;
  const query = searchParams.get("q")?.trim() || "";
  const [subscriptionRows, categories, categoryRows, progressEntries] = await Promise.all([
    db.userSubscription.findMany({
      where: {
        userId: user.id,
        status: "active",
      },
      select: {
        id: true,
        bacTypeId: true,
        expiresAt: true,
        plan: { select: { domainId: true, name: true } },
        bacType: { select: { name: true } },
        categorySelections: { select: { categoryId: true } },
      },
    }),
    db.categoryRelation.findMany({ select: { parentId: true, childId: true } }),
    db.category.findMany({ select: { id: true, name: true, slug: true } }),
    db.videoProgress.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      include: {
        chapter: {
          select: {
            id: true,
            title: true,
            order: true,
            courseId: true,
            course: { select: { id: true, title: true } },
          },
        },
      },
    }),
  ]);
  const now = new Date();
  const activeSubscriptions = subscriptionRows.filter(
    (subscription) => subscription.expiresAt > now,
  );

  const categoryLinks = categories;
  const parentMap = new Map<string, string[]>();
  for (const link of categoryLinks) {
    const parents = parentMap.get(link.childId) ?? [];
    parents.push(link.parentId);
    parentMap.set(link.childId, parents);
  }

  const grantedCategoryIds = new Set<string>();
  for (const subscription of activeSubscriptions) {
    const roots = subscription.bacTypeId
      ? [subscription.bacTypeId]
      : subscription.categorySelections.length > 0
        ? subscription.categorySelections.map((selection) => selection.categoryId)
        : [subscription.plan.domainId];
    const domainCategoryIds = new Set<string>();
    for (const root of roots) {
      for (const categoryId of collectDescendantCategoryIds(root, categoryLinks)) {
        domainCategoryIds.add(categoryId);
      }
    }
    for (const categoryId of domainCategoryIds) grantedCategoryIds.add(categoryId);
  }

  const availableCategories = activeSubscriptions.flatMap((subscription) => {
    const ids = new Set(
      categoryLinks
        .filter((link) => link.parentId === (subscription.bacTypeId ?? subscription.plan.domainId))
        .map((link) => link.childId),
    );
    return categoryRows.filter((category) => ids.has(category.id));
  });

  const grantedFilterCategories = categoryRows.filter((category) =>
    grantedCategoryIds.has(category.id),
  );
  const filterCategories = [
    ...availableCategories,
    ...grantedFilterCategories,
  ];

  const canAccessCategory = (categoryId: string) => {
    const stack: string[] = [categoryId];
    const visited = new Set<string>();
    while (stack.length > 0) {
      const currentId = stack.pop();
      if (!currentId || visited.has(currentId)) continue;
      visited.add(currentId);
      if (grantedCategoryIds.has(currentId)) return true;
      for (const parentId of parentMap.get(currentId) ?? []) {
        if (!visited.has(parentId)) stack.push(parentId);
      }
    }
    return false;
  };

  const selectedCategoryIds = categoryId
    ? collectDescendantCategoryIds(categoryId, categoryLinks)
    : null;
  const accessibleCategoryIds = selectedCategoryIds
    ? [...selectedCategoryIds].filter((id) => grantedCategoryIds.has(id))
    : [...grantedCategoryIds];
  const accessibleCourseRecords = accessibleCategoryIds.length === 0
    ? []
    : await db.course.findMany({
        where: {
          published: true,
          categories: {
            some: {
              categoryId: { in: accessibleCategoryIds },
            },
          },
          ...(query
            ? {
                OR: [
                  { title: { contains: query, mode: "insensitive" } },
                  { description: { contains: query, mode: "insensitive" } },
                  { prof: { fullName: { contains: query, mode: "insensitive" } } },
                  { tags: { some: { tag: { name: { contains: query, mode: "insensitive" } } } } },
                  { categories: { some: { category: { name: { contains: query, mode: "insensitive" } } } } },
                ],
              }
            : {}),
        },
        include: {
          prof: { select: { id: true, fullName: true } },
          categories: { include: { category: true } },
          tags: { include: { tag: true } },
          chapters: {
            where: { published: true },
            select: {
              id: true,
              title: true,
              durationSeconds: true,
              videoStatus: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

  const filteredCourseRecords = accessibleCourseRecords.filter((course) =>
    course.categories.some(({ categoryId: courseCategoryId }) =>
      canAccessCategory(courseCategoryId),
    ),
  );
  const accessibleCourseIds = new Set(filteredCourseRecords.map((course) => course.id));
  const accessibleProgressEntries = progressEntries.filter((entry) =>
    accessibleCourseIds.has(entry.chapter.courseId),
  );

  const accessibleCourses = filteredCourseRecords.map((course) => ({
      id: course.id,
      title: course.title,
      description: course.description ?? "",
      published: course.published,
      categories: course.categories.map(({ category }) => category.name),
      tags: course.tags.map(({ tag }) => tag.name),
      prof: {
        id: course.prof.id,
        name: course.prof.fullName,
        role: "Course instructor",
      },
      chapterCount: course.chapters.length,
      totalDurationSeconds: course.chapters.reduce(
        (total, chapter) => total + (chapter.durationSeconds ?? 0),
        0,
      ),
      readyChapterCount: course.chapters.filter(
        (chapter) => chapter.videoStatus === "READY",
      ).length,
  }));

  const courseProgress = filteredCourseRecords.map((course) => {
    const entries = accessibleProgressEntries.filter((entry) => entry.chapter.courseId === course.id);
    const totalChapters = course.chapters.length;
    const completedChapters = entries.filter((entry) => entry.completed).length;
    const startedChapters = entries.filter((entry) => entry.watchedSeconds > 0 || entry.completed).length;
    const nextChapter = course.chapters
      .map((chapter) => ({
        id: chapter.id,
        title: chapter.title,
        progress: entries.find((entry) => entry.chapterId === chapter.id),
      }))
      .find((chapter) => !chapter.progress?.completed) ?? null;

    return {
      courseId: course.id,
      courseTitle: course.title,
      totalChapters,
      completedChapters,
      startedChapters,
      percent: totalChapters > 0 ? Math.round((completedChapters / totalChapters) * 100) : 0,
      nextChapter: nextChapter?.title ?? null,
      nextChapterId: nextChapter?.id ?? null,
    };
  });

  const completedChapters = accessibleProgressEntries.filter((entry) => entry.completed).length;
  const inProgressChapters = accessibleProgressEntries.filter((entry) => !entry.completed && entry.watchedSeconds > 0).length;
  const totalTrackedChapters = accessibleProgressEntries.length;
  const overallCompletion = totalTrackedChapters > 0 ? Math.round((completedChapters / totalTrackedChapters) * 100) : 0;
  const activityDays = [...new Set(accessibleProgressEntries.map((entry) => entry.updatedAt.toISOString().slice(0, 10)))].sort().reverse();
  const activityLevels = accessibleProgressEntries.reduce<Record<string, number>>((levels, entry) => {
    const date = entry.updatedAt.toISOString().slice(0, 10);
    levels[date] = (levels[date] ?? 0) + 1;
    return levels;
  }, {});
  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let index = 0; index < activityDays.length; index += 1) {
    const day = new Date(`${activityDays[index]}T00:00:00`);
    const expected = new Date(today);
    expected.setDate(today.getDate() - index);
    if (day.getTime() !== expected.getTime()) break;
    streak += 1;
  }
  const nextUp = courseProgress
    .filter((item) => item.completedChapters < item.totalChapters)
    .sort((a, b) => a.percent - b.percent)[0] ?? null;

  const readyChapters = filteredCourseRecords.flatMap((course) =>
    course.chapters
      .filter((chapter) => chapter.videoStatus === "READY")
      .map((chapter) => ({
        courseId: course.id,
        courseTitle: course.title,
        chapterId: chapter.id,
        chapterTitle: chapter.title,
      })),
  );
  const recommendedChapter = readyChapters.length > 0
    ? readyChapters[Math.floor(Math.random() * readyChapters.length)]
    : null;

  const hasActiveSubscription = activeSubscriptions.length > 0;

  return ok({
    courses: accessibleCourses,
    studentProgress: {
      totalCourses: accessibleCourseIds.size,
      completedChapters,
      inProgressChapters,
      overallCompletion,
      streak,
      activeDays: activityDays.length,
      activityDates: activityDays,
      activityLevels,
      recentActivity: accessibleProgressEntries.slice(0, 8).map((entry) => ({
        id: entry.id,
        courseId: entry.chapter.courseId,
        courseTitle: entry.chapter.course.title,
        chapterId: entry.chapter.id,
        chapterTitle: entry.chapter.title,
        completed: entry.completed,
        watchedSeconds: entry.watchedSeconds,
        updatedAt: entry.updatedAt,
      })),
      milestones: [
        { id: "first-step", label: "First step", detail: "Complete your first chapter", unlocked: completedChapters >= 1 },
        { id: "deep-focus", label: "Deep focus", detail: "Complete five chapters", unlocked: completedChapters >= 5 },
        { id: "steady-rhythm", label: "Steady rhythm", detail: "Study three days in a row", unlocked: streak >= 3 },
        { id: "course-finish", label: "Course finisher", detail: "Complete an entire course", unlocked: courseProgress.some((item) => item.totalChapters > 0 && item.completedChapters === item.totalChapters) },
      ],
      nextUp: nextUp
        ? {
            courseId: nextUp.courseId,
            courseTitle: nextUp.courseTitle,
            chapterTitle: nextUp.nextChapter,
            chapterId: nextUp.nextChapterId,
            percent: nextUp.percent,
          }
        : null,
      recommendedChapter,
      courseProgress,
    },
    hasActivePack: hasActiveSubscription,
    hasActiveSubscription,
    needsCategorySelection: false,
    categorySelectionSubscriptionId: null,
    availableCategories: [...new Map(filterCategories.map((category) => [category.id, category])).values()],
    subscriptions: subscriptionRows.map((subscription) => ({
      id: subscription.id,
      bacTypeId: subscription.bacTypeId,
      bacTypeName: subscription.bacType?.name ?? null,
      planName: subscription.plan.name,
      expiresAt: subscription.expiresAt,
      accessState: subscription.expiresAt > now ? "active" : "expired",
      selectedCategoryIds: subscription.categorySelections.map((selection) => selection.categoryId),
    })),
  });
});
