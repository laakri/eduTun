"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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

const tokens = {
  ink: "#132821",
  ink60: "rgba(19,40,33,0.62)",
  paper: "#FAF8F2",
  moss: "#24463A",
  mossSoft: "#EEF2ED",
  brass: "#A9823C",
  brassSoft: "#F4ECDA",
  line: "#E4E0D3",
  card: "#FFFFFF",
};

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
  prof: { id: string; name: string; role: string };
  chapters: ChapterVM[];
};

const coverTones = [
  ["#24463A", "#3E6E5A"],
  ["#2E4A63", "#4A6E8C"],
  ["#5C3A2E", "#8C5A42"],
  ["#2E5C55", "#3E8C7E"],
] as const;

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatDuration(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.round((totalSeconds % 3600) / 60);
  if (hours > 0)
    return `${hours} h ${minutes > 0 ? `${minutes} min` : ""}`.trim();
  return `${minutes} min`;
}

function courseDuration(course: CourseVM) {
  return course.chapters.reduce(
    (sum, chapter) => sum + (chapter.durationSeconds ?? 0),
    0,
  );
}

function readyCount(course: CourseVM) {
  return course.chapters.filter((chapter) => chapter.videoStatus === "READY")
    .length;
}

function toneForCourse(course: CourseVM): readonly [string, string] {
  return (
    coverTones[course.id.charCodeAt(0) % coverTones.length] ?? coverTones[0]!
  );
}

export default function BrowseCoursesPage() {
  const [courses, setCourses] = useState<CourseVM[]>([]);
  const [hasActivePack, setHasActivePack] = useState(false);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("Toutes");
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetch("/api/learning/catalog")
      .then(async (response) => {
        const json = await response.json();
        if (!response.ok) {
          throw new Error(
            json.error?.message ?? "Could not load your courses.",
          );
        }
        setCourses(json.data?.courses ?? []);
        setHasActivePack(json.data?.hasActivePack ?? false);
      })
      .catch((reason) =>
        setError(
          reason instanceof Error
            ? reason.message
            : "Could not load your courses.",
        ),
      )
      .finally(() => setLoading(false));
  }, []);

  const categoryList = useMemo(
    () => [
      "Toutes",
      ...new Set(courses.flatMap((course) => course.categories)),
    ],
    [courses],
  );

  const suggestions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (normalizedQuery.length < 2) return [];
    return courses
      .filter(
        (course) =>
          course.title.toLowerCase().includes(normalizedQuery) ||
          course.prof.name.toLowerCase().includes(normalizedQuery),
      )
      .slice(0, 5)
      .map((course) => ({
        id: course.id,
        label: course.title,
        sub: course.categories[0] ?? course.prof.name,
      }));
  }, [courses, query]);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return courses.filter((course) => {
      const matchesCategory =
        activeCategory === "Toutes" ||
        course.categories.includes(activeCategory);
      const matchesQuery =
        normalizedQuery.length < 2 ||
        course.title.toLowerCase().includes(normalizedQuery) ||
        course.prof.name.toLowerCase().includes(normalizedQuery);
      return matchesCategory && matchesQuery;
    });
  }, [activeCategory, courses, query]);

  const selected =
    courses.find((course) => course.id === selectedCourseId) ?? null;
  const featured = courses[0];

  function openCourse(id: string) {
    setSelectedCourseId(id);
    requestAnimationFrame(() =>
      panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  }

  if (loading) {
    return (
      <main
        className="flex min-h-[70svh] items-center justify-center"
        style={{ backgroundColor: tokens.paper }}
      >
        <Loader2 className="animate-spin" style={{ color: tokens.moss }} />
      </main>
    );
  }

  if (error) {
    return (
      <main
        className="mx-auto max-w-3xl px-6 py-20"
        style={{ color: tokens.ink }}
      >
        <h1 className="text-2xl font-semibold">
          Your learning space is unavailable
        </h1>
        <p className="mt-2" style={{ color: tokens.ink60 }}>
          {error}
        </p>
        <Link className="mt-6 inline-block underline" href="/packs">
          Browse packs
        </Link>
      </main>
    );
  }

  if (courses.length === 0) {
    return (
      <main
        className="mx-auto max-w-3xl px-6 py-20"
        style={{ backgroundColor: tokens.paper, color: tokens.ink }}
      >
        <h1 className="text-3xl font-semibold">
          Your courses will appear here
        </h1>
        <p className="mt-3" style={{ color: tokens.ink60 }}>
          {hasActivePack
            ? "Your pack is active, but it does not contain any published courses yet. Courses will appear here after an instructor publishes them."
            : "Buy or activate a study pack to see its available courses."}
        </p>
        <Button className="mt-6" asChild>
          <Link href="/packs">Browse packs</Link>
        </Button>
      </main>
    );
  }

  return (
    <div style={{ backgroundColor: tokens.paper, color: tokens.ink }}>
      <section className="mx-auto grid max-w-6xl gap-12 px-6 py-16 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <div>
          <p className="text-sm" style={{ color: tokens.brass }}>
            {courses.length} cours · tes packs actifs
          </p>
          <h1 className="mt-3 text-4xl font-semibold leading-[1.12] sm:text-[2.75rem]">
            Choisis ta matière, avance avec le prof qui t&apos;explique le
            mieux.
          </h1>
          <p
            className="mt-5 max-w-md text-[15px] leading-relaxed"
            style={{ color: tokens.ink60 }}
          >
            Retrouve les cours inclus dans tes packs, avec leurs chapitres, quiz
            et ressources.
          </p>
          <div className="relative mt-8 max-w-md">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
              style={{ color: tokens.ink60 }}
            />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cherche un cours ou un prof…"
              className="h-11 rounded-md pl-9"
              style={{ borderColor: tokens.line, backgroundColor: tokens.card }}
            />
            {suggestions.length > 0 && (
              <div
                className="absolute z-10 mt-2 w-full overflow-hidden rounded-md border shadow-sm"
                style={{
                  borderColor: tokens.line,
                  backgroundColor: tokens.card,
                }}
              >
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion.id}
                    onClick={() => {
                      openCourse(suggestion.id);
                      setQuery("");
                    }}
                    className="flex w-full items-center justify-between px-3.5 py-2.5 text-left text-sm hover:bg-[#EEF2ED]"
                  >
                    <span>{suggestion.label}</span>
                    <span className="text-xs" style={{ color: tokens.ink60 }}>
                      {suggestion.sub}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div
            className="mt-8 flex items-center gap-6 text-sm"
            style={{ color: tokens.ink60 }}
          >
            <span className="flex items-center gap-1.5">
              <BookOpen className="h-4 w-4" />
              {courses.reduce(
                (sum, course) => sum + course.chapters.length,
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

        {featured && (
          <div className="relative mx-auto w-full max-w-sm">
            <div
              className="overflow-hidden rounded-lg border"
              style={{ borderColor: tokens.line, backgroundColor: tokens.card }}
            >
              <button
                onClick={() => openCourse(featured.id)}
                className="group relative flex h-44 w-full items-center justify-center"
                style={{
                  background: `linear-gradient(135deg, ${toneForCourse(featured)[0]}, ${toneForCourse(featured)[1]})`,
                }}
              >
                <PlayCircle className="h-12 w-12 text-white/90 transition-transform group-hover:scale-105" />
                <span
                  className="absolute bottom-3 right-3 rounded px-2 py-0.5 text-xs font-medium text-white"
                  style={{ backgroundColor: "rgba(0,0,0,0.35)" }}
                >
                  {formatDuration(courseDuration(featured))}
                </span>
              </button>
              <div className="p-5">
                <p className="text-xs" style={{ color: tokens.brass }}>
                  {featured.categories[0] ?? "Course"}
                </p>
                <p className="mt-1.5 text-lg font-semibold leading-snug">
                  {featured.title}
                </p>
                <div className="mt-3 flex items-center gap-2.5">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback
                      className="text-xs"
                      style={{
                        backgroundColor: tokens.mossSoft,
                        color: tokens.moss,
                      }}
                    >
                      {initials(featured.prof.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-sm">
                    <p className="font-medium leading-none">
                      {featured.prof.name}
                    </p>
                    <p
                      className="mt-0.5 text-xs"
                      style={{ color: tokens.ink60 }}
                    >
                      {featured.prof.role}
                    </p>
                  </div>
                </div>
                <Button
                  className="mt-5 w-full"
                  style={{ backgroundColor: tokens.moss, color: "white" }}
                  onClick={() => openCourse(featured.id)}
                >
                  View course
                </Button>
              </div>
            </div>
          </div>
        )}
      </section>

      <section id="cours" className="mx-auto max-w-6xl px-6 py-14">
        <div
          className="flex flex-wrap items-end justify-between gap-6 border-b pb-4"
          style={{ borderColor: tokens.line }}
        >
          <h2 className="text-2xl font-semibold">My courses</h2>
          <div className="flex flex-wrap gap-6 text-sm">
            {categoryList.map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className="relative -mb-4 pb-4 transition-colors"
                style={{
                  color:
                    activeCategory === category ? tokens.ink : tokens.ink60,
                  fontWeight: activeCategory === category ? 600 : 400,
                }}
              >
                {category}
                {activeCategory === category && (
                  <span
                    className="absolute -bottom-px left-0 h-[2px] w-full"
                    style={{ backgroundColor: tokens.moss }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="mt-10 text-sm" style={{ color: tokens.ink60 }}>
            No course matches your search.
          </p>
        ) : (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((course) => {
              const ready = readyCount(course);
              const total = course.chapters.length;
              const tone = toneForCourse(course);
              return (
                <button
                  key={course.id}
                  onClick={() => openCourse(course.id)}
                  className="group flex flex-col overflow-hidden rounded-lg border text-left transition-colors"
                  style={{
                    borderColor:
                      selectedCourseId === course.id
                        ? tokens.moss
                        : tokens.line,
                    backgroundColor: tokens.card,
                  }}
                >
                  <div
                    className="relative flex h-32 items-center justify-center"
                    style={{
                      background: `linear-gradient(135deg, ${tone[0]}, ${tone[1]})`,
                    }}
                  >
                    <PlayCircle className="h-9 w-9 text-white/85 transition-transform group-hover:scale-105" />
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <p className="text-xs" style={{ color: tokens.brass }}>
                      {course.categories[0] ?? "Course"}
                    </p>
                    <p className="mt-1.5 text-base font-semibold leading-snug">
                      {course.title}
                    </p>
                    <p
                      className="mt-2 line-clamp-2 text-sm leading-relaxed"
                      style={{ color: tokens.ink60 }}
                    >
                      {course.description}
                    </p>
                    <div className="mt-4 flex items-center gap-2.5">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback
                          className="text-[10px]"
                          style={{
                            backgroundColor: tokens.mossSoft,
                            color: tokens.moss,
                          }}
                        >
                          {initials(course.prof.name)}
                        </AvatarFallback>
                      </Avatar>
                      <Link
                        href={`/professors/${course.prof.id}`}
                        onClick={(event) => event.stopPropagation()}
                        className="text-xs hover:underline"
                        style={{ color: tokens.ink60 }}
                      >
                        {course.prof.name}
                      </Link>
                    </div>
                    <Separator
                      className="my-4"
                      style={{ backgroundColor: tokens.line }}
                    />
                    <div
                      className="flex items-center justify-between text-xs"
                      style={{ color: tokens.ink60 }}
                    >
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
                      <p
                        className="mt-2 text-xs"
                        style={{ color: tokens.brass }}
                      >
                        {ready}/{total} chapters ready
                      </p>
                    )}
                    <span
                      className="mt-4 flex items-center gap-1 text-sm opacity-0 transition-opacity group-hover:opacity-100"
                      style={{ color: tokens.moss }}
                    >
                      View chapters <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <section
        ref={panelRef}
        className="mx-auto max-w-6xl scroll-mt-10 px-6 pb-24"
      >
        {!selected ? (
          <div
            className="rounded-lg border border-dashed p-10 text-center text-sm"
            style={{ borderColor: tokens.line, color: tokens.ink60 }}
          >
            Choose a course above to see its chapters.
          </div>
        ) : (
          <div
            className="overflow-hidden rounded-lg border"
            style={{ borderColor: tokens.line, backgroundColor: tokens.card }}
          >
            <div
              className="flex flex-col gap-6 p-8 sm:flex-row sm:items-start sm:justify-between"
              style={{ backgroundColor: tokens.mossSoft }}
            >
              <div className="max-w-2xl">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant="secondary"
                    className="font-normal"
                    style={{
                      backgroundColor: tokens.brassSoft,
                      color: tokens.brass,
                    }}
                  >
                    {selected.categories[0] ?? "Course"}
                  </Badge>
                  {selected.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="font-normal">
                      {tag}
                    </Badge>
                  ))}
                </div>
                <h3 className="mt-3 text-2xl font-semibold">
                  {selected.title}
                </h3>
                <p
                  className="mt-2 text-sm leading-relaxed"
                  style={{ color: tokens.ink60 }}
                >
                  {selected.description}
                </p>
                <div className="mt-4 flex items-center gap-2.5">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback
                      className="text-xs"
                      style={{
                        backgroundColor: tokens.card,
                        color: tokens.moss,
                      }}
                    >
                      {initials(selected.prof.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-sm">
                    <p className="font-medium leading-none">
                      {selected.prof.name}
                    </p>
                    <p
                      className="mt-0.5 text-xs"
                      style={{ color: tokens.ink60 }}
                    >
                      {selected.prof.role}
                    </p>
                  </div>
                </div>
              </div>
              <Button
                asChild
                className="shrink-0"
                style={{ backgroundColor: tokens.moss, color: "white" }}
                disabled={readyCount(selected) === 0}
              >
                <Link href={`/learn/${selected.id}`}>
                  {readyCount(selected) === 0
                    ? "Not ready yet"
                    : "Start course"}
                </Link>
              </Button>
            </div>
            <div className="p-8">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Course chapters</p>
                <p className="text-xs" style={{ color: tokens.ink60 }}>
                  {selected.chapters.length} chapter
                  {selected.chapters.length > 1 ? "s" : ""} ·{" "}
                  {formatDuration(courseDuration(selected))}
                </p>
              </div>
              <ol className="mt-4 space-y-2">
                {selected.chapters.map((chapter) => {
                  const isReady = chapter.videoStatus === "READY";
                  return (
                    <li
                      key={chapter.id}
                      className="flex items-center gap-4 rounded-md border px-4 py-3"
                      style={{ borderColor: tokens.line }}
                    >
                      <span
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: tokens.brassSoft,
                          color: tokens.brass,
                        }}
                      >
                        {chapter.order}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {chapter.title}
                        </p>
                        <div
                          className="mt-1 flex flex-wrap items-center gap-3 text-xs"
                          style={{ color: tokens.ink60 }}
                        >
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
                            href={`/learn/${selected.id}/chapters/${chapter.id}`}
                          >
                            Start
                          </Link>
                        </Button>
                      ) : (
                        <span
                          className="flex shrink-0 items-center gap-1.5 text-xs"
                          style={{ color: tokens.ink60 }}
                        >
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
    </div>
  );
}
