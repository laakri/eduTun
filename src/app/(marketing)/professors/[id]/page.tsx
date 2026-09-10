"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  CalendarDays,
  Check,
  Loader2,
  MessageCircle,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Chapter = {
  id: string;
  title: string;
  order: number;
  durationSeconds: number | null;
  videoStatus: string;
  score: number;
  commentCount: number;
};
type Course = {
  id: string;
  title: string;
  description: string | null;
  categories: string[];
  chapters: Chapter[];
};
type Professor = {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  memberSince: string;
  isAuthenticated: boolean;
  isOwner: boolean;
  viewerRating: number | null;
  stats: {
    courseCount: number;
    chapterCount: number;
    ratingCount: number;
    averageRating: number | null;
  };
  courses: Course[];
};
type Feedback = {
  score: number;
  viewerVote: number;
  comments: Array<{
    id: string;
    body: string;
    createdAt: string;
    user: { fullName: string };
  }>;
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}
function formatDuration(seconds: number | null) {
  if (!seconds) return "Duration pending";
  return `${Math.round(seconds / 60)} min`;
}

function ChapterFeedback({
  chapter,
  isAuthenticated,
}: {
  chapter: Chapter;
  isAuthenticated: boolean;
}) {
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [comment, setComment] = useState("");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    const response = await fetch(`/api/chapters/${chapter.id}/feedback`);
    const json = await response.json();
    if (response.ok) setFeedback(json.data);
  }
  async function vote(value: 1 | -1) {
    if (!isAuthenticated) {
      setMessage("Log in to vote on chapters.");
      return;
    }
    setBusy(true);
    const response = await fetch(`/api/chapters/${chapter.id}/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "vote", value }),
    });
    if (response.ok) await load();
    setBusy(false);
  }
  async function submitComment(event: React.FormEvent) {
    event.preventDefault();
    if (!isAuthenticated) {
      setMessage("Log in to comment on chapters.");
      return;
    }
    if (!comment.trim()) return;
    setBusy(true);
    const response = await fetch(`/api/chapters/${chapter.id}/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "comment", body: comment }),
    });
    if (response.ok) {
      setComment("");
      await load();
    }
    setBusy(false);
  }
  return (
    <div className="mt-3 border-t border-border/40 pt-3">
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => vote(1)}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
        >
          <ArrowUp className="size-4" />
          {feedback?.score ?? chapter.score}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => vote(-1)}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
        >
          <ArrowDown className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen((value) => !value);
            if (!feedback) void load();
          }}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <MessageCircle className="size-3.5" />
          {feedback?.comments.length ?? chapter.commentCount} comments
        </button>
      </div>
      {message && (
        <p className="mt-2 text-xs text-muted-foreground">{message}</p>
      )}
      {open && (
        <div className="mt-3 space-y-3">
          {feedback?.comments.map((item) => (
            <div
              key={item.id}
              className="rounded-md bg-muted/50 px-3 py-2 text-xs"
            >
              <p className="font-medium">{item.user.fullName}</p>
              <p className="mt-1 text-muted-foreground">{item.body}</p>
            </div>
          ))}
          {isAuthenticated ? (
            <form onSubmit={submitComment} className="flex gap-2">
              <Input
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                placeholder="Add a comment"
                maxLength={1000}
              />
              <Button size="sm" disabled={busy || !comment.trim()}>
                Post
              </Button>
            </form>
          ) : (
            <p className="text-xs text-muted-foreground">
              Log in to join the discussion.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function PublicProfessorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [professor, setProfessor] = useState<Professor | null>(null);
  const [error, setError] = useState("");
  const [rating, setRating] = useState(0);
  const [savingRating, setSavingRating] = useState(false);
  useEffect(() => {
    params.then(({ id }) =>
      fetch(`/api/professors/${id}`)
        .then(async (response) => {
          const json = await response.json();
          if (!response.ok)
            throw new Error(json.error?.message ?? "Professor not found");
          setProfessor(json.data);
          setRating(json.data.viewerRating ?? 0);
        })
        .catch((reason) => setError(reason.message)),
    );
  }, [params]);
  async function saveRating(value: number) {
    if (!professor?.isAuthenticated) return;
    setRating(value);
    setSavingRating(true);
    await fetch(`/api/professors/${professor.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating: value }),
    });
    setSavingRating(false);
  }
  if (error)
    return (
      <main className="mx-auto max-w-3xl px-6 py-20">
        <h1 className="text-2xl font-semibold">{error}</h1>
        <Link className="mt-4 inline-block underline" href="/learn">
          Back to courses
        </Link>
      </main>
    );
  if (!professor)
    return (
      <main className="flex min-h-[70svh] items-center justify-center">
        <Loader2 className="animate-spin" />
      </main>
    );
  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <Link
        href="/learn"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        Back to courses
      </Link>
      <section className="mt-8 flex flex-col gap-6 rounded-xl bg-muted/30 p-6 sm:flex-row sm:items-center">
        <div className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-xl font-semibold">
          {professor.avatarUrl ? (
            <img
              src={professor.avatarUrl}
              alt={professor.fullName}
              className="size-full object-cover"
            />
          ) : (
            initials(professor.fullName)
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs uppercase tracking-[0.16em] text-primary">
            Professor profile
          </p>
          <h1 className="mt-2 text-3xl font-semibold">{professor.fullName}</h1>
          <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarDays className="size-4" />
            Teaching since {formatDate(professor.memberSince)}
          </p>
        </div>
        {professor.isOwner ? (
          <div className="rounded-lg bg-primary/10 p-4 text-sm">
            <p className="font-medium">This is your public profile.</p>
            <p className="mt-1 text-muted-foreground">
              Students can discover your courses and join the discussion here.
            </p>
            <Button asChild variant="outline" size="sm" className="mt-3">
              <Link href="/profile">Edit profile</Link>
            </Button>
          </div>
        ) : !professor.isAuthenticated ? (
          <div className="rounded-lg bg-muted/60 p-4 text-sm">
            <p className="font-medium">Want to rate or discuss a chapter?</p>
            <p className="mt-1 text-muted-foreground">
              Log in to join the learning community.
            </p>
            <Button asChild size="sm" className="mt-3">
              <Link href="/register?mode=login">Log in</Link>
            </Button>
          </div>
        ) : null}
      </section>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Stat
          label="Courses"
          value={professor.stats.courseCount}
          icon={<BookOpen className="size-4" />}
        />
        <Stat
          label="Chapters"
          value={professor.stats.chapterCount}
          icon={<MessageCircle className="size-4" />}
        />
        <Stat
          label="Rating"
          value={
            professor.stats.averageRating
              ? `${professor.stats.averageRating}/5`
              : "New"
          }
          icon={<Star className="size-4" />}
        />
      </div>
      <section className="mt-8 rounded-xl bg-muted/30 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Student rating</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {professor.stats.ratingCount} rating
              {professor.stats.ratingCount === 1 ? "" : "s"}
            </p>
          </div>
          {professor.isOwner ? (
            <span className="text-sm text-muted-foreground">
              You cannot rate your own profile.
            </span>
          ) : professor.isAuthenticated ? (
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  disabled={savingRating}
                  onClick={() => void saveRating(value)}
                  aria-label={`Rate ${value} stars`}
                  className={
                    value <= rating
                      ? "text-amber-500"
                      : "text-muted-foreground/30"
                  }
                >
                  <Star className="size-5 fill-current" />
                </button>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">
                Log in to rate
              </span>
              <Button asChild size="sm" variant="outline">
                <Link href="/register?mode=login">Login</Link>
              </Button>
            </div>
          )}
        </div>
      </section>
      <section className="mt-8 space-y-4">
        <h2 className="text-xl font-semibold">
          Courses by {professor.fullName}
        </h2>
        {professor.courses.map((course) => (
          <Card key={course.id} className="border-0 bg-card p-5 shadow-none">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap gap-2">
                  {course.categories.map((category) => (
                    <span
                      key={category}
                      className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground"
                    >
                      {category}
                    </span>
                  ))}
                </div>
                <h3 className="mt-3 text-lg font-semibold">{course.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {course.description}
                </p>
              </div>
              <Button asChild size="sm">
                <Link href={`/learn/${course.id}`}>Open course</Link>
              </Button>
            </div>
            <div className="mt-5 space-y-2">
              {course.chapters.map((chapter) => (
                <div key={chapter.id} className="rounded-lg bg-muted/30 p-3">
                  <div className="flex items-center gap-3">
                    <span className="flex size-7 items-center justify-center rounded-full bg-muted text-xs font-medium">
                      {chapter.order}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {chapter.title}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDuration(chapter.durationSeconds)} ·{" "}
                        {chapter.videoStatus === "READY"
                          ? "Ready"
                          : "Processing"}
                      </p>
                    </div>
                  </div>
                  <ChapterFeedback
                    chapter={chapter}
                    isAuthenticated={professor.isAuthenticated}
                  />
                </div>
              ))}
            </div>
          </Card>
        ))}
      </section>
      <p className="mt-10 text-center text-xs text-muted-foreground">
        <Check className="mr-1 inline size-3.5" />
        Public profile · Course content remains protected by pack access.
      </p>
    </main>
  );
}

function Stat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-muted/30 p-4">
      <span className="text-primary">{icon}</span>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-lg font-semibold">{value}</p>
      </div>
    </div>
  );
}
