"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2, PlayCircle } from "lucide-react";
import { VideoPlayer } from "@/components/video-player";

type Section = {
  id: string;
  title: string;
  startSeconds: number;
  endSeconds: number;
};
type Chapter = {
  id: string;
  title: string;
  description: string | null;
  order: number;
  playbackUrl: string | null;
  sections: Section[];
  resources: Array<{ id: string; title: string; sizeBytes: number | null }>;
};
type Course = {
  id: string;
  title: string;
  description: string | null;
  canEdit: boolean;
  chapters: Chapter[];
};

export default function LearnCoursePage() {
  const { courseId } = useParams<{ courseId: string }>();
  const requestedChapter = useSearchParams().get("chapter");
  const [course, setCourse] = useState<Course | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    fetch(`/api/learning/course?courseId=${courseId}`)
      .then(async (response) => {
        const json = await response.json();
        if (!response.ok)
          throw new Error(json.error?.message || "Course unavailable");
        setCourse(json.data);
        setSelectedId(
          json.data.chapters.some(
            (item: Chapter) => item.id === requestedChapter,
          )
            ? requestedChapter
            : (json.data.chapters[0]?.id ?? null),
        );
      })
      .catch((e) => setError(e.message));
  }, [courseId, requestedChapter]);
  const chapter = useMemo(
    () => course?.chapters.find((item) => item.id === selectedId) ?? null,
    [course, selectedId],
  );
  if (error)
    return (
      <main className="mx-auto max-w-3xl px-6 py-16">
        <Link href="/packs" className="text-sm underline">
          Back to packs
        </Link>
        <h1 className="mt-6 text-2xl font-semibold">{error}</h1>
        <p className="mt-2 text-muted-foreground">
          Sign in with the account that owns this pack to continue.
        </p>
      </main>
    );
  if (!course)
    return (
      <main className="flex min-h-[70svh] items-center justify-center">
        <Loader2 className="animate-spin" />
      </main>
    );
  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <Link
        href="/packs"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground"
      >
        <ArrowLeft className="size-4" />
        My packs
      </Link>
      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section>
          <h1 className="text-2xl font-bold">{course.title}</h1>
          {course.description && (
            <p className="mt-2 text-muted-foreground">{course.description}</p>
          )}
          {chapter?.playbackUrl ? (
            <VideoPlayer
              className="mt-6"
              src={chapter.playbackUrl}
              title={chapter.title}
              chapters={chapter.sections.map((section) => ({
                id: section.id,
                title: section.title,
                start: section.startSeconds,
              }))}
            />
          ) : (
            <div className="mt-6 flex aspect-video items-center justify-center rounded-xl bg-muted text-muted-foreground">
              Video is still being prepared.
            </div>
          )}
          {chapter && (
            <>
              <h2 className="mt-6 text-xl font-semibold">{chapter.title}</h2>
              {chapter.description && (
                <p className="mt-2 text-muted-foreground">
                  {chapter.description}
                </p>
              )}
              {chapter.resources.length > 0 && (
                <div className="mt-6">
                  <h3 className="font-semibold">Downloads</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    PDF resources are attached to this lesson.
                  </p>
                </div>
              )}
            </>
          )}
        </section>
        <aside className="rounded-xl p-3 bg-muted">
          <h2 className="px-2 py-2 font-semibold">Course chapters</h2>
          {course.chapters.map((item, index) => (
            <Link
              key={item.id}
              href={`/learn/${course.id}/chapters/${item.id}`}
              className={`flex w-full items-start gap-3 rounded-lg p-3 text-left ${item.id === selectedId ? "bg-muted" : "hover:bg-muted/60"}`}
            >
              <PlayCircle className="mt-0.5 size-4 shrink-0 text-primary" />
              <span>
                <span className="block text-sm font-medium">
                  {index + 1}. {item.title}
                </span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  {item.sections.length} sections
                </span>
              </span>
            </Link>
          ))}
        </aside>
      </div>
    </main>
  );
}
