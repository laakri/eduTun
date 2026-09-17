"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock3,
  Loader2,
  Play,
  Search,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";

type Course = {
  id: string;
  title: string;
  description: string;
  categories: string[];
  tags: string[];
  prof: {
    id: string;
    name: string;
    role: string;
  };
  chapterCount: number;
  totalDurationSeconds: number;
  readyChapterCount: number;
};

type ProgressCourse = {
  courseId: string;
  percent: number;
  completedChapters: number;
  totalChapters: number;
  nextChapter: string | null;
  nextChapterId: string | null;
};

type Category = {
  id: string;
  name: string;
  slug: string;
};

type CatalogData = {
  courses: Course[];
  hasActivePack: boolean;
  needsCategorySelection: boolean;
  categorySelectionSubscriptionId: string | null;

  availableCategories: Category[];

  subscriptions: Array<{
    id: string;
    bacTypeName: string | null;
    planName: string;
    expiresAt: string;
    accessState: "active" | "expired";
    selectedCategoryIds: string[];
  }>;

  studentProgress: {
    nextUp: {
      courseId: string;
      courseTitle: string;
      chapterTitle: string | null;
      chapterId: string | null;
      percent: number;
    } | null;

    recommendedChapter: {
      courseId: string;
      courseTitle: string;
      chapterId: string;
      chapterTitle: string;
    } | null;

    courseProgress: ProgressCourse[];
  };
};

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function formatDuration(seconds: number) {
  const minutes = Math.round(seconds / 60);

  if (minutes >= 60) {
    return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  }

  return `${minutes} min`;
}

function formatAccessDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
  }).format(new Date(value));
}

/* -------------------------------------------------------------------------- */
/* Course skeleton                                                            */
/* -------------------------------------------------------------------------- */

function CourseSkeleton() {
  return (
    <div className="flex flex-col gap-5 py-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-4">
        <div className="size-11 shrink-0 animate-pulse rounded-xl bg-muted" />

        <div className="min-w-0 flex-1">
          <div className="h-4 w-48 animate-pulse rounded bg-muted" />

          <div className="mt-2 h-3 w-full max-w-xl animate-pulse rounded bg-muted" />

          <div className="mt-3 flex gap-4">
            <div className="h-3 w-20 animate-pulse rounded bg-muted" />
            <div className="h-3 w-24 animate-pulse rounded bg-muted" />
            <div className="h-3 w-20 animate-pulse rounded bg-muted" />
          </div>
        </div>
      </div>

      <div className="flex w-full items-center gap-4 sm:w-44">
        <div className="flex-1">
          <div className="mb-2 h-3 w-full animate-pulse rounded bg-muted" />
          <div className="h-1.5 w-full animate-pulse rounded-full bg-muted" />
        </div>

        <div className="size-8 animate-pulse rounded-full bg-muted" />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Course skeleton list                                                       */
/* -------------------------------------------------------------------------- */

function CourseSkeletonList() {
  return (
    <div className="mt-8 divide-y divide-border/50">
      <CourseSkeleton />
      <CourseSkeleton />
      <CourseSkeleton />
      <CourseSkeleton />
      <CourseSkeleton />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Course row                                                                 */
/* -------------------------------------------------------------------------- */

function CourseRow({
  course,
  progress,
}: {
  course: Course;
  progress: ProgressCourse | undefined;
}) {
  const percent = progress?.percent ?? 0;

  const href = progress?.nextChapterId
    ? `/learn/${course.id}?chapter=${progress.nextChapterId}`
    : `/learn/${course.id}`;

  return (
    <Link
      href={href}
      className="
        group flex flex-col gap-5
        py-5
        transition-colors
        hover:bg-muted/30
        sm:-mx-4 sm:flex-row sm:items-center
        sm:justify-between sm:rounded-xl sm:px-4
      "
    >
      {/* Course information */}

      <div className="flex min-w-0 items-start gap-4">
        <div
          className="
            mt-0.5 flex size-11 shrink-0 items-center justify-center
            rounded-xl bg-muted text-muted-foreground
            transition-colors
            group-hover:bg-primary/10 group-hover:text-primary
          "
        >
          <BookOpen className="size-4" />
        </div>

        <div className="min-w-0">
          <h3 className="font-medium text-foreground transition-colors group-hover:text-primary">
            {course.title}
          </h3>

          <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
            {course.description ||
              "Build your understanding through focused chapters."}
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>{course.prof.name}</span>

            <span className="flex items-center gap-1">
              <BookOpen className="size-3.5" />
              {course.chapterCount} chapters
            </span>

            <span className="flex items-center gap-1">
              <Clock3 className="size-3.5" />
              {formatDuration(course.totalDurationSeconds)}
            </span>
          </div>
        </div>
      </div>

      {/* Progress */}

      <div className="flex shrink-0 items-center gap-4 sm:w-44">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>
              {progress
                ? `${progress.completedChapters}/${progress.totalChapters} done`
                : "Not started"}
            </span>

            <span>{percent}%</span>
          </div>

          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{
                width: `${percent}%`,
              }}
            />
          </div>
        </div>

        <div
          className="
            flex size-8 shrink-0 items-center justify-center
            rounded-full text-primary
            transition-all
            group-hover:bg-primary/10
          "
        >
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
        </div>
      </div>
    </Link>
  );
}

/* -------------------------------------------------------------------------- */
/* Main page                                                                  */
/* -------------------------------------------------------------------------- */

export default function LearnPage() {
  const [catalog, setCatalog] = useState<CatalogData | null>(null);

  const [activeSubjectId, setActiveSubjectId] = useState<string | null>(
    null
  );

  const [query, setQuery] = useState("");

  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>(
    []
  );

  const [savingCategories, setSavingCategories] = useState(false);

  const [loading, setLoading] = useState(true);

  const [subjectLoading, setSubjectLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const requestController = useRef<AbortController | null>(null);
  const catalogLoaded = useRef(false);

  /* ------------------------------------------------------------------------ */
  /* Initial catalog                                                          */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    async function loadCatalog() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch("/api/learning/catalog", {
          method: "GET",
          cache: "no-store",
        });

        const json = await response.json();

        if (!response.ok) {
          throw new Error(
            json.error?.message ?? "Could not load your courses."
          );
        }

        const data = json.data as CatalogData;

        catalogLoaded.current = true;
        setCatalog(data);

        setActiveSubjectId(null);

        const subscription = data.subscriptions.find(
          (item) =>
            item.id === data.categorySelectionSubscriptionId
        );

        setSelectedCategoryIds(
          subscription?.selectedCategoryIds ?? []
        );
      } catch (reason: unknown) {
        setError(
          reason instanceof Error
            ? reason.message
            : "Could not load your courses."
        );
      } finally {
        setLoading(false);
      }
    }

    void loadCatalog();
  }, []);

  /* ------------------------------------------------------------------------ */
  /* Load subject from API                                                    */
  /* ------------------------------------------------------------------------ */

  async function loadSubject(
    categoryId: string | null,
    searchQuery = "",
  ) {
    requestController.current?.abort();
    const controller = new AbortController();
    requestController.current = controller;

    try {
      setSubjectLoading(true);
      setError(null);

      setActiveSubjectId(categoryId);

      const params = new URLSearchParams();
      if (categoryId) params.set("categoryId", categoryId);
      if (searchQuery.trim()) params.set("q", searchQuery.trim());
      const queryString = params.toString();
      const url = queryString
        ? `/api/learning/catalog?${queryString}`
        : "/api/learning/catalog";

      const response = await fetch(url, {
        method: "GET",
        cache: "no-store",
        signal: controller.signal,
      });

      const json = await response.json();

      if (!response.ok) {
        throw new Error(
          json.error?.message ?? "Could not load this subject."
        );
      }

      const data = json.data as CatalogData;

      setCatalog(data);
    } catch (reason: unknown) {
      if (reason instanceof DOMException && reason.name === "AbortError") {
        return;
      }

      setError(
        reason instanceof Error
          ? reason.message
          : "Could not load this subject."
      );
    } finally {
      setSubjectLoading(false);
    }
  }

  useEffect(() => {
    if (!catalogLoaded.current) return;

    const timer = window.setTimeout(() => {
      void loadSubject(activeSubjectId, query);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [activeSubjectId, query]);

  /* ------------------------------------------------------------------------ */
  /* Save selected subjects                                                   */
  /* ------------------------------------------------------------------------ */

  async function saveCategorySelection() {
    if (
      !catalog?.categorySelectionSubscriptionId ||
      selectedCategoryIds.length === 0
    ) {
      return;
    }

    try {
      setSavingCategories(true);
      setError(null);

      const response = await fetch(
        `/api/subscriptions/${catalog.categorySelectionSubscriptionId}/categories`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            categoryIds: selectedCategoryIds,
          }),
        }
      );

      const json = await response.json();

      if (!response.ok) {
        throw new Error(
          json.error?.message ?? "Could not save your subjects."
        );
      }

      await loadSubject(null, "");
    } catch (reason: unknown) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Could not save your subjects."
      );
    } finally {
      setSavingCategories(false);
    }
  }

  /* ------------------------------------------------------------------------ */
  /* Derived state                                                            */
  /* ------------------------------------------------------------------------ */

  const subjects = catalog?.availableCategories ?? [];

  const activeSubject = subjects.find(
    (subject) => subject.id === activeSubjectId
  );

  const filteredCourses = catalog?.courses ?? [];

  const progressByCourse = useMemo(() => {
    return new Map(
      (catalog?.studentProgress.courseProgress ?? []).map(
        (item) => [item.courseId, item]
      )
    );
  }, [catalog]);

  /* ------------------------------------------------------------------------ */
  /* Initial loading                                                           */
  /* ------------------------------------------------------------------------ */

  if (loading) {
    return (
      <main className="min-h-screen bg-background">
        <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 lg:px-10">
          <div className="space-y-3">
            <div className="h-4 w-40 animate-pulse rounded bg-muted" />

            <div className="h-10 w-72 animate-pulse rounded bg-muted" />

            <div className="h-4 w-full max-w-2xl animate-pulse rounded bg-muted" />
          </div>

          <div className="mt-10 flex gap-2 overflow-hidden">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="h-9 w-24 shrink-0 animate-pulse rounded-full bg-muted"
              />
            ))}
          </div>

          <CourseSkeletonList />
        </div>
      </main>
    );
  }

  /* ------------------------------------------------------------------------ */
  /* Error                                                                     */
  /* ------------------------------------------------------------------------ */

  if (error || !catalog) {
    return (
      <main className="min-h-screen bg-background">
        <div className="mx-auto flex min-h-[60vh] max-w-3xl flex-col items-center justify-center px-6 text-center">
          <p className="text-sm text-destructive">
            {error ?? "Your learning space is unavailable."}
          </p>

          <Button asChild className="mt-6">
            <Link href="/packs">Browse packs</Link>
          </Button>
        </div>
      </main>
    );
  }

  /* ------------------------------------------------------------------------ */
  /* Choose subjects                                                           */
  /* ------------------------------------------------------------------------ */

  if (
    catalog.needsCategorySelection &&
    catalog.courses.length === 0
  ) {
    return (
      <main className="min-h-screen bg-background">
        <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8">
          <p className="text-sm font-medium text-primary">
            Your Bac access is approved
          </p>

          <h1 className="mt-3 text-3xl font-semibold tracking-tight">
            Choose your subjects
          </h1>

          <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
            Select the subjects you want to study. Your learning
            space will show matching courses and chapters.
          </p>

          <div className="mt-8 grid gap-2 sm:grid-cols-2">
            {catalog.availableCategories.map((category) => {
              const selected = selectedCategoryIds.includes(
                category.id
              );

              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() =>
                    setSelectedCategoryIds((current) =>
                      selected
                        ? current.filter(
                            (id) => id !== category.id
                          )
                        : [...current, category.id]
                    )
                  }
                  className={`
                    flex items-center justify-between
                    rounded-xl px-4 py-3.5
                    text-left text-sm font-medium
                    transition-colors
                    ${
                      selected
                        ? "bg-primary/10 text-primary"
                        : "bg-muted/50 text-foreground hover:bg-muted"
                    }
                  `}
                >
                  <span>{category.name}</span>

                  {selected ? (
                    <CheckCircle2 className="size-4 shrink-0" />
                  ) : (
                    <span className="size-4 shrink-0 rounded-full bg-background" />
                  )}
                </button>
              );
            })}
          </div>

          <Button
            className="mt-8"
            onClick={() => void saveCategorySelection()}
            disabled={
              savingCategories ||
              selectedCategoryIds.length === 0
            }
          >
            {savingCategories ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : null}

            Continue to my courses
          </Button>
        </div>
      </main>
    );
  }

  /* ------------------------------------------------------------------------ */
  /* Continue section                                                          */
  /* ------------------------------------------------------------------------ */

  const nextUp = catalog.studentProgress.nextUp;

  const recommended =
    catalog.studentProgress.recommendedChapter;

  const banner = nextUp ?? recommended;

  const bannerIsNew = !nextUp && Boolean(recommended);

  /* ------------------------------------------------------------------------ */
  /* Render                                                                    */
  /* ------------------------------------------------------------------------ */

  return (
    <main className="min-h-screen bg-background text-foreground">
      {/*
        AppShell owns the sidebar + application header.
        DO NOT create another sidebar here.
      */}

      <div className="mx-auto w-full max-w-7xl px-5 py-6 sm:px-8 lg:px-10">
        {/* ---------------------------------------------------------------- */}
        {/* Page header                                                        */}
        {/* ---------------------------------------------------------------- */}

        <header>
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <BookOpen className="size-4" />

            <span>
              {catalog.courses.length} courses available
            </span>
          </div>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Your learning desk
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            Find your courses, continue where you left off, and
            stay focused on your Bac preparation.
          </p>
        </header>

        {catalog.subscriptions.length > 0 && (
          <section className="mt-6 border-y border-border py-4">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Your Curio access
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {catalog.subscriptions.map((subscription) => (
                <div
                  key={subscription.id}
                  className={`flex items-center justify-between gap-4 border px-3 py-3 ${
                    subscription.accessState === "active"
                      ? "border-border"
                      : "border-amber-500/30 bg-amber-500/5"
                  }`}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {subscription.bacTypeName ?? "Bac access"}
                    </p>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {subscription.planName}
                    </p>
                  </div>
                  <p className={`shrink-0 text-xs ${subscription.accessState === "active" ? "text-muted-foreground" : "font-medium text-amber-700"}`}>
                    {subscription.accessState === "active"
                      ? `Until ${formatAccessDate(subscription.expiresAt)}`
                      : `Expired ${formatAccessDate(subscription.expiresAt)}`}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Continue learning                                                 */}
        {/* ---------------------------------------------------------------- */}

        {banner && !subjectLoading && (
          <section
            id="continue"
            className="
              relative mt-8 overflow-hidden
              rounded-2xl bg-primary
              px-6 py-7 text-primary-foreground
              sm:px-8 sm:py-9
            "
          >
            <div className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-primary-foreground/10 blur-2xl" />

            <div className="pointer-events-none absolute -right-4 bottom-0 size-32 rounded-full bg-primary-foreground/10 blur-xl" />

            <div className="relative max-w-2xl">
              <div className="flex items-center gap-2 text-sm font-medium text-primary-foreground/80">
                {bannerIsNew ? (
                  <Sparkles className="size-4" />
                ) : (
                  <Play className="size-4 fill-current" />
                )}

                {bannerIsNew
                  ? "A good place to begin"
                  : "Pick up where you left off"}
              </div>

              <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
                {bannerIsNew
                  ? recommended?.chapterTitle
                  : nextUp?.chapterTitle ??
                    nextUp?.courseTitle}
              </h2>

              <p className="mt-2 text-sm text-primary-foreground/75">
                {banner.courseTitle}

                {nextUp
                  ? ` · ${nextUp.percent}% complete`
                  : " · A recommended chapter from your subjects"}
              </p>

              <Button
                asChild
                variant="secondary"
                className="mt-6"
              >
                <Link
                  href={`/learn/${banner.courseId}?chapter=${banner.chapterId}`}
                >
                  {bannerIsNew
                    ? "Start this chapter"
                    : "Continue learning"}

                  <ArrowRight className="ml-2 size-4" />
                </Link>
              </Button>
            </div>
          </section>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Course discovery                                                   */}
        {/* ---------------------------------------------------------------- */}

        <section
          id="subjects"
          className="mt-10"
        >
          <div className="flex flex-col gap-5">
            {/* Section heading */}

            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-semibold tracking-tight">
                    Explore courses
                  </h2>

                  {subjectLoading && (
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                  )}
                </div>

                <p className="mt-1 text-sm text-muted-foreground">
                  {subjectLoading
                    ? "Finding courses..."
                    : activeSubject
                      ? `${filteredCourses.length} course${
                          filteredCourses.length === 1
                            ? ""
                            : "s"
                        } in ${activeSubject.name}`
                      : `${filteredCourses.length} courses across your subjects`}
                </p>
              </div>

            </div>

            {/* Search */}

            <div className="flex items-center gap-3">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

                <Input
                  value={query}
                  onChange={(event) =>
                    setQuery(event.target.value)
                  }
                  placeholder="Search courses, teachers, topics..."
                  className="
                    h-11
                    border-0
                    bg-muted/50
                    pl-9
                    shadow-none
                    ring-0
                    focus-visible:ring-1
                    focus-visible:ring-primary/20
                  "
                />
              </div>

              <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
                <PopoverTrigger
                  render={
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 shrink-0 gap-2 px-3"
                    />
                  }
                >
                  <SlidersHorizontal className="size-4" />
                  Filters
                  {activeSubject ? (
                    <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[11px] text-primary-foreground">
                      1
                    </span>
                  ) : null}
                </PopoverTrigger>

                <PopoverContent align="end" className="w-80 p-4">
                  <PopoverHeader>
                    <PopoverTitle>Filter courses</PopoverTitle>
                    <PopoverDescription>
                      Choose a subject to narrow your course list.
                    </PopoverDescription>
                  </PopoverHeader>

                  <div className="mt-2 grid gap-1">
                    <button
                      type="button"
                      className={`flex items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                        activeSubjectId === null
                          ? "bg-primary/10 font-medium text-primary"
                          : "hover:bg-muted"
                      }`}
                      onClick={() => {
                        setQuery("");
                        setActiveSubjectId(null);
                        setFiltersOpen(false);
                      }}
                    >
                      <span>All courses</span>
                      {activeSubjectId === null ? (
                        <CheckCircle2 className="size-4" />
                      ) : null}
                    </button>

                    {subjects.map((subject) => (
                      <button
                        key={subject.id}
                        type="button"
                        className={`flex items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                          activeSubjectId === subject.id
                            ? "bg-primary/10 font-medium text-primary"
                            : "hover:bg-muted"
                        }`}
                        onClick={() => {
                          setQuery("");
                          setActiveSubjectId(subject.id);
                          setFiltersOpen(false);
                        }}
                      >
                        <span>{subject.name}</span>
                        {activeSubjectId === subject.id ? (
                          <CheckCircle2 className="size-4" />
                        ) : null}
                      </button>
                    ))}
                  </div>

                  {activeSubject ? (
                    <Button
                      type="button"
                      variant="ghost"
                      className="mt-2 w-full justify-center text-muted-foreground"
                      onClick={() => {
                        setQuery("");
                        setActiveSubjectId(null);
                        setFiltersOpen(false);
                      }}
                    >
                      Clear subject filter
                    </Button>
                  ) : null}
                </PopoverContent>
              </Popover>
            </div>

          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Courses                                                            */}
        {/* ---------------------------------------------------------------- */}

        {subjectLoading ? (
          <CourseSkeletonList />
        ) : (
          <div className="mt-7">
            {filteredCourses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-muted">
                  <Search className="size-5 text-muted-foreground" />
                </div>

                <h3 className="mt-4 text-sm font-semibold">
                  No courses found
                </h3>

                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  Try another subject or change your search.
                </p>

                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    className="mt-4 text-sm font-medium text-primary hover:underline"
                  >
                    Clear search
                  </button>
                )}
              </div>
            ) : (
              <section>
                {/* Active filter heading */}

                <div className="mb-1 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold">
                      {activeSubject
                        ? activeSubject.name
                        : "All courses"}
                    </h3>

                    <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                      {filteredCourses.length}
                    </span>
                  </div>

                  {activeSubject && (
                    <button
                      type="button"
                      onClick={() => {
                        setQuery("");
                        setActiveSubjectId(null);
                      }}
                      className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                    >
                      Clear filter
                    </button>
                  )}
                </div>

                {/* Course rows */}

                <div className="divide-y divide-border/50">
                  {filteredCourses.map((course) => (
                    <CourseRow
                      key={course.id}
                      course={course}
                      progress={progressByCourse.get(
                        course.id
                      )}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
