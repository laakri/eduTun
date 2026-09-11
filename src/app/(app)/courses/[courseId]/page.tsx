"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Clock3,
  ImageIcon,
  Loader2,
  Plus,
  Video,
} from "lucide-react";

import { Button } from "@/components/ui/button";

type ChapterStatus = "ready" | "processing" | "failed";

type Chapter = {
  id: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  status: ChapterStatus;
  published: boolean;
  sections: unknown[];
  resources: unknown[];
};

type Course = {
  id: string;
  title: string;
  description: string | null;
  published: boolean;
  coverImageUrl: string | null;
  chapters: Chapter[];
};

export default function CourseStudioPage() {
  const { courseId } = useParams<{ courseId: string }>();

  const [course, setCourse] = useState<Course | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [chapterPublishing, setChapterPublishing] = useState<string | null>(
    null,
  );

  useEffect(() => {
    async function loadCourse(): Promise<void> {
      try {
        const res = await fetch(`/api/course-studio?courseId=${courseId}`);
        const json: {
          data?: Course;
          error?: { message?: string };
        } = await res.json();

        if (!res.ok) {
          throw new Error(
            json.error?.message || "Could not load course",
          );
        }

        if (!json.data) {
          throw new Error("Could not load course");
        }

        setCourse(json.data);
      } catch (errorValue) {
        setError(
          errorValue instanceof Error
            ? errorValue.message
            : "Could not load course",
        );
      }
    }

    loadCourse();
  }, [courseId]);

  async function updatePublication(published: boolean): Promise<void> {
    setPublishing(true);
    setError(null);

    try {
      const res = await fetch(`/api/courses/${courseId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ published }),
      });

      const json: {
        data?: {
          published: boolean;
        };
        error?: {
          message?: string;
        };
      } = await res.json();

      if (!res.ok) {
        throw new Error(
          json.error?.message || "Could not update course status",
        );
      }

      if (typeof json.data?.published !== "boolean") {
        throw new Error("Could not update course status");
      }

      setCourse((current) =>
        current
          ? {
              ...current,
              published: json.data!.published,
            }
          : current,
      );
    } catch (errorValue) {
      setError(
        errorValue instanceof Error
          ? errorValue.message
          : "Could not update course status",
      );
    } finally {
      setPublishing(false);
    }
  }

  async function updateChapterPublication(
    chapterId: string,
    published: boolean,
  ): Promise<void> {
    setChapterPublishing(chapterId);
    setError(null);

    try {
      const res = await fetch(`/api/chapters/${chapterId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ published }),
      });

      const json: {
        data?: {
          published: boolean;
        };
        error?: {
          message?: string;
        };
      } = await res.json();

      if (!res.ok) {
        throw new Error(
          json.error?.message || "Could not update chapter status",
        );
      }

      if (typeof json.data?.published !== "boolean") {
        throw new Error("Could not update chapter status");
      }

      setCourse((current) =>
        current
          ? {
              ...current,
              chapters: current.chapters.map((chapter) =>
                chapter.id === chapterId
                  ? {
                      ...chapter,
                      published: json.data!.published,
                    }
                  : chapter,
              ),
            }
          : current,
      );
    } catch (errorValue) {
      setError(
        errorValue instanceof Error
          ? errorValue.message
          : "Could not update chapter status",
      );
    } finally {
      setChapterPublishing(null);
    }
  }

  function getChapterStatus(chapter: Chapter): {
    icon: React.ReactNode;
    label: string;
  } {
    if (chapter.status === "ready") {
      return {
        icon: <CheckCircle2 className="size-3.5" />,
        label: "Ready",
      };
    }

    if (chapter.status === "failed") {
      return {
        icon: <Clock3 className="size-3.5" />,
        label: "Failed",
      };
    }

    return {
      icon: <Clock3 className="size-3.5" />,
      label: "Processing",
    };
  }

  if (error && !course) {
    return (
      <div className="mx-auto max-w-5xl py-16 text-sm text-destructive">
        {error}
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="space-y-10">
        {/* Back */}
        <Link
          href="/courses"
          className="group inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
          Courses
        </Link>

        {/* Course header */}
        <section className="border-b border-border pb-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              {/* Small course cover */}
              <div className="size-24 shrink-0 overflow-hidden rounded-md border border-border bg-muted sm:size-28">
                {course.coverImageUrl ? (
                  <img
                    src={course.coverImageUrl}
                    alt={`${course.title} cover`}
                    className="size-full object-cover transition-transform duration-500 hover:scale-[1.02]"
                  />
                ) : (
                  <div className="flex size-full items-center justify-center">
                    <ImageIcon className="size-6 text-muted-foreground" />
                  </div>
                )}
              </div>

              {/* Course identity */}
              <div className="min-w-0">
                <div className="mb-1.5 flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{course.published ? "Published" : "Draft"}</span>
                  <span aria-hidden="true">·</span>
                  <span>
                    {course.chapters.length}{" "}
                    {course.chapters.length === 1 ? "chapter" : "chapters"}
                  </span>
                </div>

                <h1 className="truncate text-xl font-semibold tracking-tight sm:text-2xl">
                  {course.title}
                </h1>

                <p className="mt-1.5 line-clamp-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                  {course.description || "No course description yet."}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex shrink-0 items-center gap-2 sm:self-center">
              <Button
                size="sm"
                variant={course.published ? "outline" : "default"}
                disabled={publishing}
                onClick={() => updatePublication(!course.published)}
              >
                {publishing
                  ? "Saving..."
                  : course.published
                    ? "Make draft"
                    : "Publish"}
              </Button>

              <Button asChild size="sm">
                <Link href={`/courses/${course.id}/chapters/new`}>
                  <Plus />
                  Add chapter
                </Link>
              </Button>
            </div>
          </div>

          {error && (
            <p className="mt-4 text-sm text-destructive">{error}</p>
          )}
        </section>

        {/* Curriculum */}
        <section>
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">
                Curriculum
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Manage your chapters and publication status.
              </p>
            </div>
          </div>

          <div className="mt-6">
            {course.chapters.length === 0 ? (
              <div className="border-y border-border py-12 text-center">
                <BookOpen className="mx-auto size-5 text-muted-foreground" />
                <p className="mt-3 text-sm font-medium">
                  No chapters yet
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Add your first chapter to start building the course.
                </p>
                <Button asChild size="sm" className="mt-5">
                  <Link href={`/courses/${course.id}/chapters/new`}>
                    <Plus />
                    Add chapter
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="border-y border-border">
                {course.chapters.map((chapter, index) => {
                  const chapterStatus = getChapterStatus(chapter);

                  return (
                    <div
                      key={chapter.id}
                      className="group border-b border-border py-4 last:border-b-0"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                        {/* Thumbnail */}
                        <Link
                          href={`/learn/${course.id}/chapters/${chapter.id}`}
                          className="relative h-20 w-full shrink-0 overflow-hidden rounded-md border border-border bg-muted sm:h-20 sm:w-32"
                        >
                          {chapter.thumbnailUrl ? (
                            <img
                              src={chapter.thumbnailUrl}
                              alt=""
                              className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                            />
                          ) : (
                            <div className="flex size-full items-center justify-center">
                              <Video className="size-5 text-muted-foreground" />
                            </div>
                          )}
                        </Link>

                        {/* Chapter info */}
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span>Chapter {index + 1}</span>

                            <span aria-hidden="true">·</span>

                            <span className="inline-flex items-center gap-1.5">
                              {chapterStatus.icon}
                              {chapterStatus.label}
                            </span>

                            <span aria-hidden="true">·</span>

                            <span>
                              {chapter.published ? "Published" : "Draft"}
                            </span>
                          </div>

                          <Link
                            href={`/learn/${course.id}/chapters/${chapter.id}`}
                            className="mt-1.5 block truncate font-medium transition-colors hover:text-primary"
                          >
                            {chapter.title}
                          </Link>

                          <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                            {chapter.description ||
                              "No chapter description yet."}
                          </p>

                          <p className="mt-1.5 text-xs text-muted-foreground">
                            {chapter.sections.length} timestamps
                            {" · "}
                            {chapter.resources.length} resources
                          </p>
                        </div>

                        {/* Chapter action */}
                        <div className="shrink-0 sm:pl-4">
                          <Button
                            type="button"
                            size="sm"
                            variant={
                              chapter.published ? "outline" : "default"
                            }
                            disabled={chapterPublishing === chapter.id}
                            onClick={() =>
                              updateChapterPublication(
                                chapter.id,
                                !chapter.published,
                              )
                            }
                            className="w-full sm:w-auto"
                          >
                            {chapterPublishing === chapter.id
                              ? "Saving..."
                              : chapter.published
                                ? "Make draft"
                                : "Publish"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
