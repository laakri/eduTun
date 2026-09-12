"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Search,
  ArrowRight,
  PlayCircle,
  Clock,
  BookOpen,
  CircleCheck,
  Loader2,
  FileText,
  HelpCircle,
} from "lucide-react";

type VideoStatus = "UPLOADING" | "PROCESSING" | "READY" | "FAILED";

type ChapterVM = {
  id: string;
  title: string;
  order: number;
  durationSeconds: number | null;
  videoStatus: VideoStatus;
  hasQuiz: boolean;
  resourceCount: number;
};

type CourseVM = {
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
  chapters: ChapterVM[];
};

const coverTones = [
  "bg-muted",
  "bg-secondary",
  "bg-accent",
  "bg-muted/70",
] as const;

function initials(name: string): string {
  return name
    .split(" ")
    .map((part: string) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.round((totalSeconds % 3600) / 60);

  if (hours > 0) {
    return `${hours} h${minutes > 0 ? ` ${minutes} min` : ""}`;
  }

  return `${minutes} min`;
}

function courseDuration(course: CourseVM): number {
  return course.chapters.reduce(
    (sum: number, chapter: ChapterVM) =>
      sum + (chapter.durationSeconds ?? 0),
    0,
  );
}

function readyCount(course: CourseVM): number {
  return course.chapters.filter(
    (chapter: ChapterVM) => chapter.videoStatus === "READY",
  ).length;
}

function coverTone(course: CourseVM): string {
  return (
    coverTones[course.id.charCodeAt(0) % coverTones.length] ??
    coverTones[0]
  );
}

function CourseCover({
  course,
  featured = false,
  onClick,
}: {
  course: CourseVM;
  featured?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative flex w-full items-center justify-center overflow-hidden ${coverTone(
        course,
      )} ${featured ? "h-48" : "h-36"}`}
    >
      <div className="absolute inset-0 bg-foreground/[0.03] transition-colors duration-300 group-hover:bg-foreground/[0.06]" />

      <PlayCircle
        className={`relative text-foreground/70 transition-transform duration-300 group-hover:scale-110 ${
          featured ? "h-12 w-12" : "h-10 w-10"
        }`}
        strokeWidth={1.5}
      />

      <span className="absolute bottom-3 right-3 rounded-md bg-background/90 px-2 py-1 text-xs font-medium text-foreground shadow-sm">
        {formatDuration(courseDuration(course))}
      </span>
    </button>
  );
}

export default function BrowseCoursesPage() {
  const [courses, setCourses] = useState<CourseVM[]>([]);
  const [hasActivePack, setHasActivePack] = useState<boolean>(false);
  const [needsCategorySelection, setNeedsCategorySelection] = useState(false);
  const [categorySelectionSubscriptionId, setCategorySelectionSubscriptionId] = useState<string | null>(null);
  const [availableCategories, setAvailableCategories] = useState<Array<{ id: string; name: string; slug: string }>>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [approvedAccess, setApprovedAccess] = useState<{ bacTypeName: string | null; planName: string } | null>(null);
  const [savingCategories, setSavingCategories] = useState(false);
  const [query, setQuery] = useState<string>("");
  const [activeCategory, setActiveCategory] = useState<string>("Toutes");
  const [activeProfessor, setActiveProfessor] = useState<string>("Tous les profs");
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(
    null,
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadCatalog(): Promise<void> {
      try {
        const response = await fetch("/api/learning/catalog");

        const json = await response.json();

        if (!response.ok) {
          throw new Error(
            json.error?.message ?? "Could not load your courses.",
          );
        }

        if (cancelled) {
          return;
        }

        setCourses(json.data?.courses ?? []);
        setHasActivePack(json.data?.hasActivePack ?? false);
        setNeedsCategorySelection(json.data?.needsCategorySelection ?? false);
        setCategorySelectionSubscriptionId(json.data?.categorySelectionSubscriptionId ?? null);
        setAvailableCategories(json.data?.availableCategories ?? []);
        setApprovedAccess(json.data?.subscriptions?.[0] ?? null);
        setSelectedCategoryIds(
          json.data?.subscriptions?.find(
            (subscription: { id: string; selectedCategoryIds: string[] }) =>
              subscription.id === json.data?.categorySelectionSubscriptionId,
          )?.selectedCategoryIds ?? [],
        );
      } catch (reason: unknown) {
        if (cancelled) {
          return;
        }

        setError(
          reason instanceof Error
            ? reason.message
            : "Could not load your courses.",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadCatalog();

    return () => {
      cancelled = true;
    };
  }, []);

  async function saveCategorySelection() {
    if (!categorySelectionSubscriptionId || selectedCategoryIds.length === 0) return;
    setSavingCategories(true);
    setError(null);
    try {
      const response = await fetch(`/api/subscriptions/${categorySelectionSubscriptionId}/categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryIds: selectedCategoryIds }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error?.message ?? "Could not save your categories.");
      window.location.reload();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save your categories.");
    } finally {
      setSavingCategories(false);
    }
  }

  const categoryList = useMemo<string[]>(() => {
    return [
      "Toutes",
      ...new Set(
        courses.flatMap((course: CourseVM) => course.categories),
      ),
    ];
  }, [courses]);

  const professorList = useMemo<string[]>(() => {
    return [
      "Tous les profs",
      ...new Set(courses.map((course: CourseVM) => course.prof.name)),
    ];
  }, [courses]);

  const suggestions = useMemo<
    { id: string; label: string; sub: string }[]
  >(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (normalizedQuery.length < 2) {
      return [];
    }

    return courses
      .filter(
        (course: CourseVM) =>
          course.title.toLowerCase().includes(normalizedQuery) ||
          course.prof.name.toLowerCase().includes(normalizedQuery) ||
          course.tags.some((tag) => tag.toLowerCase().includes(normalizedQuery)) ||
          course.chapters.some((chapter) => chapter.title.toLowerCase().includes(normalizedQuery)),
      )
      .slice(0, 5)
      .map((course: CourseVM) => ({
        id: course.id,
        label: course.title,
        sub: course.categories[0] ?? course.prof.name,
      }));
  }, [courses, query]);

  const filteredCourses = useMemo<CourseVM[]>(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return courses.filter((course: CourseVM) => {
      const matchesCategory =
        activeCategory === "Toutes" ||
        course.categories.includes(activeCategory);

      const matchesQuery =
        normalizedQuery.length < 2 ||
        course.title.toLowerCase().includes(normalizedQuery) ||
        course.prof.name.toLowerCase().includes(normalizedQuery) ||
        course.tags.some((tag) => tag.toLowerCase().includes(normalizedQuery)) ||
        course.chapters.some((chapter) => chapter.title.toLowerCase().includes(normalizedQuery));

      const matchesProfessor =
        activeProfessor === "Tous les profs" ||
        course.prof.name === activeProfessor;

      return matchesCategory && matchesProfessor && matchesQuery;
    });
  }, [activeCategory, activeProfessor, courses, query]);

  const selectedCourse =
    courses.find((course: CourseVM) => course.id === selectedCourseId) ??
    null;

  const featuredCourse = courses[0] ?? null;

  function openCourse(id: string): void {
    setSelectedCourseId(id);

    requestAnimationFrame(() => {
      panelRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }

  if (loading) {
    return (
      <main className="flex min-h-[70svh] items-center justify-center bg-background">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-20">
        <h1 className="text-2xl font-semibold tracking-tight">
          Your learning space is unavailable
        </h1>

        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {error}
        </p>

        <Button asChild variant="outline" className="mt-6">
          <Link href="/packs">Browse packs</Link>
        </Button>
      </main>
    );
  }

  if (courses.length === 0) {
    if (needsCategorySelection) {
      return (
        <main className="mx-auto max-w-3xl px-6 py-20">
          <p className="text-sm font-medium text-primary">Your Bac access is approved</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">Choose your subjects</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
            Select the categories you want to study. Your learning space will show the matching courses, chapters, and professors.
          </p>
          {approvedAccess && (
            <div className="mt-6 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
              <p className="font-medium">{approvedAccess.bacTypeName ?? "Approved Bac access"}</p>
              <p className="mt-1 text-muted-foreground">Subscription: {approvedAccess.planName}</p>
            </div>
          )}
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {availableCategories.map((category) => {
              const selected = selectedCategoryIds.includes(category.id);
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setSelectedCategoryIds((current) => selected ? current.filter((id) => id !== category.id) : [...current, category.id])}
                  className={`flex items-center justify-between rounded-xl border p-4 text-left transition ${selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
                >
                  <span>
                    <span className="block text-sm font-medium">{category.name}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">Browse courses in this category</span>
                  </span>
                  {selected && <CircleCheck className="size-5 shrink-0 text-primary" />}
                </button>
              );
            })}
          </div>
          <Button className="mt-8" onClick={() => void saveCategorySelection()} disabled={savingCategories || selectedCategoryIds.length === 0}>
            {savingCategories ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            Continue to my courses
          </Button>
        </main>
      );
    }

    return (
      <main className="mx-auto max-w-3xl px-6 py-20">
        <div className="max-w-xl">
          <p className="text-sm font-medium text-primary">
            Your learning space
          </p>

          <h1 className="mt-3 text-3xl font-semibold tracking-tight">
            Your courses will appear here
          </h1>

          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {hasActivePack
              ? "Your pack is active, but it does not contain any published courses yet. Courses will appear here after an instructor publishes them."
              : "Buy or activate a study pack to see its available courses."}
          </p>

          <Button asChild className="mt-6">
            <Link href="/packs">Browse packs</Link>
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Hero */}
      <section>
        <div className="mx-auto grid max-w-6xl gap-12 px-6 py-14 sm:py-16 lg:grid-cols-[1fr_420px] lg:items-center lg:gap-20">
          <div>
            <p className="text-sm font-medium text-primary">
              {courses.length} cours · tes packs actifs
            </p>

            <h1 className="mt-3 max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
              Apprends à ton rythme.
            </h1>

            <p className="mt-5 max-w-xl text-[15px] leading-7 text-muted-foreground">
              Retrouve les cours inclus dans tes packs, avec leurs chapitres,
              quiz et ressources.
            </p>

            {/* Search */}
            <div className="relative mt-8 max-w-lg">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cours, chapitre, prof ou mot-clé…"
                className="h-12 rounded-lg bg-background pl-10 shadow-sm"
              />

              {suggestions.length > 0 && (
                <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-lg border bg-popover p-1 text-popover-foreground shadow-md">
                  {suggestions.map(
                    (suggestion: {
                      id: string;
                      label: string;
                      sub: string;
                    }) => (
                      <button
                        key={suggestion.id}
                        type="button"
                        onClick={() => {
                          openCourse(suggestion.id);
                          setQuery("");
                        }}
                        className="flex w-full items-center justify-between gap-4 rounded-md px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                      >
                        <span className="min-w-0 truncate font-medium">
                          {suggestion.label}
                        </span>

                        <span className="shrink-0 text-xs text-muted-foreground">
                          {suggestion.sub}
                        </span>
                      </button>
                    ),
                  )}
                </div>
              )}
            </div>

            <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <BookOpen className="h-4 w-4" />
                {courses.reduce(
                  (sum: number, course: CourseVM) =>
                    sum + course.chapters.length,
                  0,
                )}{" "}
                chapters
              </span>

              <span className="flex items-center gap-1.5">
                <CircleCheck className="h-4 w-4" />
                {courses.length} available courses
              </span>
            </div>
          </div>

          {/* Featured */}
          {featuredCourse && (
            <div className="overflow-hidden rounded-lg border border-border bg-muted/40">
              <CourseCover
                course={featuredCourse}
                featured
                onClick={() => openCourse(featuredCourse.id)}
              />

              <div className="p-5">
                <p className="text-xs font-medium text-primary">
                  {featuredCourse.categories[0] ?? "Course"}
                </p>

                <h2 className="mt-1.5 text-lg font-semibold leading-snug">
                  {featuredCourse.title}
                </h2>

                <div className="mt-4 flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-muted text-xs">
                      {initials(featuredCourse.prof.name)}
                    </AvatarFallback>
                  </Avatar>

                  <div>
                    <p className="text-sm font-medium">
                      {featuredCourse.prof.name}
                    </p>

                    <p className="text-xs text-muted-foreground">
                      {featuredCourse.prof.role}
                    </p>
                  </div>
                </div>

                <Button
                  className="mt-5 w-full"
                  onClick={() => openCourse(featuredCourse.id)}
                >
                  View course
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Courses */}
      <section
        id="cours"
        className="mx-auto max-w-6xl px-6 py-14 sm:py-16"
      >
        <div className="flex flex-col gap-5 pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              My courses
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              {filteredCourses.length} course{filteredCourses.length === 1 ? "" : "s"} match your filters.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <label className="sr-only" htmlFor="professor-filter">Filter by professor</label>
            <select
              id="professor-filter"
              value={activeProfessor}
              onChange={(event) => setActiveProfessor(event.target.value)}
              className="h-9 rounded-md border border-input bg-background px-2.5 text-xs text-foreground outline-none focus:border-primary"
            >
              {professorList.map((professor) => (
                <option key={professor}>{professor}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 flex max-w-full gap-5 overflow-x-auto pb-3">
            {categoryList.map((category: string) => {
              const active = activeCategory === category;

              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => setActiveCategory(category)}
                  className={`relative shrink-0 pb-4 text-sm transition-colors ${
                    active
                      ? "font-medium text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {category}

                  {active && (
                    <span className="absolute -bottom-3 left-0 h-0.5 w-full bg-primary" />
                  )}
                </button>
              );
            })}
        </div>

        {filteredCourses.length === 0 ? (
          <div className="py-14 text-center">
            <p className="text-sm text-muted-foreground">
              No course matches your search.
            </p>
          </div>
        ) : (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredCourses.map((course: CourseVM) => {
              const ready = readyCount(course);
              const total = course.chapters.length;

              return (
                <button
                  key={course.id}
                  type="button"
                  onClick={() => openCourse(course.id)}
                  className={`group flex min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-muted/20 text-left transition-colors duration-200 hover:bg-muted/50 ${
                    selectedCourseId === course.id
                      ? "bg-muted/60 ring-1 ring-primary/40"
                      : ""
                  }`}
                >
                  <CourseCover
                    course={course}
                    onClick={() => openCourse(course.id)}
                  />

                  <div className="flex flex-1 flex-col p-5">
                    <p className="text-xs font-medium text-primary">
                      {course.categories[0] ?? "Course"}
                    </p>

                    <h3 className="mt-1.5 line-clamp-2 text-base font-semibold leading-snug">
                      {course.title}
                    </h3>

                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
                      {course.description}
                    </p>

                    <div className="mt-4 flex items-center gap-2.5">
                      <Avatar className="h-7 w-7">
                        <AvatarFallback className="bg-muted text-[10px]">
                          {initials(course.prof.name)}
                        </AvatarFallback>
                      </Avatar>

                      <Link
                        href={`/professors/${course.prof.id}`}
                        onClick={(event) => event.stopPropagation()}
                        className="truncate text-xs text-muted-foreground transition-colors hover:text-foreground hover:underline"
                      >
                        {course.prof.name}
                      </Link>
                    </div>

                    <div className="my-4 h-px bg-muted" />

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <BookOpen className="h-3.5 w-3.5" />
                        {total} chapter{total > 1 ? "s" : ""}
                      </span>

                      <span className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        {formatDuration(courseDuration(course))}
                      </span>
                    </div>

                    {ready < total && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        {ready}/{total} chapters ready
                      </p>
                    )}

                    <div className="mt-5 flex items-center text-sm font-medium text-primary">
                      View chapters
                      <ArrowRight className="ml-1.5 h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-1" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Selected course */}
      <section
        ref={panelRef}
        className="mx-auto max-w-6xl scroll-mt-8 px-6 pb-24"
      >
        {!selectedCourse ? (
          <div className="rounded-lg bg-muted/30 p-10 text-center">
            <BookOpen className="mx-auto h-5 w-5 text-muted-foreground" />

            <p className="mt-3 text-sm text-muted-foreground">
              Choose a course above to see its chapters.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border bg-muted/20">
            {/* Course header */}
            <div className="bg-muted/40 p-6 sm:p-8">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                <div className="max-w-2xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">
                      {selectedCourse.categories[0] ?? "Course"}
                    </Badge>

                    {selectedCourse.tags.map((tag: string) => (
                      <Badge key={tag} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                  </div>

                  <h3 className="mt-3 text-2xl font-semibold tracking-tight">
                    {selectedCourse.title}
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {selectedCourse.description}
                  </p>

                  <div className="mt-5 flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-background text-xs">
                        {initials(selectedCourse.prof.name)}
                      </AvatarFallback>
                    </Avatar>

                    <div>
                      <p className="text-sm font-medium">
                        {selectedCourse.prof.name}
                      </p>

                      <p className="text-xs text-muted-foreground">
                        {selectedCourse.prof.role}
                      </p>
                    </div>
                  </div>
                </div>

                <Button
                  asChild
                  className="shrink-0"
                  disabled={readyCount(selectedCourse) === 0}
                >
                  <Link href={`/learn/${selectedCourse.id}`}>
                    {readyCount(selectedCourse) === 0
                      ? "Not ready yet"
                      : "Start course"}

                    {readyCount(selectedCourse) > 0 && (
                      <ArrowRight className="ml-2 h-4 w-4" />
                    )}
                  </Link>
                </Button>
              </div>
            </div>

            {/* Chapters */}
            <div className="p-6 sm:p-8">
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm font-medium">Course chapters</p>

                <p className="text-xs text-muted-foreground">
                  {selectedCourse.chapters.length} chapter
                  {selectedCourse.chapters.length > 1 ? "s" : ""} ·{" "}
                  {formatDuration(courseDuration(selectedCourse))}
                </p>
              </div>

              <ol className="mt-4 space-y-2">
                {selectedCourse.chapters.map((chapter: ChapterVM) => {
                  const isReady = chapter.videoStatus === "READY";

                  return (
                    <li
                      key={chapter.id}
                      className="flex items-center gap-4 rounded-md border border-border bg-muted/30 p-3.5 transition-colors hover:bg-muted/60"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                        {chapter.order}
                      </span>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {chapter.title}
                        </p>

                        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />

                            {chapter.durationSeconds
                              ? formatDuration(chapter.durationSeconds)
                              : "Duration pending"}
                          </span>

                          {chapter.hasQuiz && (
                            <span className="flex items-center gap-1">
                              <HelpCircle className="h-3.5 w-3.5" />
                              Quiz
                            </span>
                          )}

                          {chapter.resourceCount > 0 && (
                            <span className="flex items-center gap-1">
                              <FileText className="h-3.5 w-3.5" />

                              {chapter.resourceCount} resource
                              {chapter.resourceCount > 1 ? "s" : ""}
                            </span>
                          )}
                        </div>
                      </div>

                      {isReady ? (
                        <Button
                          asChild
                          variant="ghost"
                          size="sm"
                          className="shrink-0"
                        >
                          <Link
                            href={`/learn/${selectedCourse.id}/chapters/${chapter.id}`}
                          >
                            Start
                            <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                          </Link>
                        </Button>
                      ) : (
                        <span className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Processing
                        </span>
                      )}
                    </li>
                  );
                })}
              </ol>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
