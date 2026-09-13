"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle2,
  Flame,
  Loader2,
  Play,
  Target,
  TrendingUp,
} from "lucide-react";

import { Button } from "@/components/ui/button";

 type ProgressCourse = {
  courseId: string;
  courseTitle: string;
  totalChapters: number;
  completedChapters: number;
  startedChapters: number;
  percent: number;
  nextChapter: string | null;
  nextChapterId: string | null;
};

type RecentActivity = {
  id: string;
  courseId: string;
  courseTitle: string;
  chapterId: string;
  chapterTitle: string;
  completed: boolean;
  watchedSeconds: number;
  updatedAt: string;
};

type Milestone = {
  id: string;
  label: string;
  detail: string;
  unlocked: boolean;
};

type ProgressData = {
  totalCourses: number;
  completedChapters: number;
  inProgressChapters: number;
  overallCompletion: number;
  streak: number;
  activeDays: number;
  activityDates: string[];
  activityLevels: Record<string, number>;
  nextUp: {
    courseId: string;
    courseTitle: string;
    chapterTitle: string | null;
    chapterId: string | null;
    percent: number;
  } | null;
  courseProgress: ProgressCourse[];
  recentActivity: RecentActivity[];
  milestones: Milestone[];
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatWatchTime(seconds: number) {
  if (seconds < 60) return "Started";
  const minutes = Math.round(seconds / 60);
  return `${minutes} min watched`;
}

function initials(title: string) {
  return title
    .split(" ")
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

export default function ProgressPage() {
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/learning/catalog")
      .then(async (response) => {
        const json = await response.json();
        if (!response.ok) throw new Error(json.error?.message ?? "Could not load progress.");
        setProgress(json.data?.studentProgress ?? null);
      })
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : "Could not load progress.");
      });
  }, []);

  if (error) {
    return <main className="mx-auto max-w-3xl px-6 py-20 text-sm text-destructive">{error}</main>;
  }

  if (!progress) {
    return (
      <main className="flex min-h-[70svh] items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </main>
    );
  }

  const unlockedMilestones = progress.milestones.filter((milestone) => milestone.unlocked).length;
  const activityLevels = progress.activityLevels ?? {};
  const metrics: Array<{
    label: string;
    value: string | number;
    detail: string;
    icon: typeof Target;
  }> = [
    { label: "Overall completion", value: `${progress.overallCompletion}%`, detail: "Across tracked lessons", icon: Target },
    { label: "Chapters completed", value: progress.completedChapters, detail: "Knowledge banked", icon: CheckCircle2 },
    { label: "Current streak", value: `${progress.streak} ${progress.streak === 1 ? "day" : "days"}`, detail: "Keep the rhythm going", icon: Flame },
    { label: "Active days", value: progress.activeDays, detail: "Days you showed up", icon: TrendingUp },
  ];

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-6xl px-6 py-12 sm:py-16">
        <div className="flex flex-col gap-6 border-b border-border pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-primary">Your learning record</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Progress that compounds.</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
              See what you have mastered, where your momentum is strongest, and the next lesson worth your attention.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/learn">Browse my courses <ArrowRight className="ml-2 size-4" /></Link>
          </Button>
        </div>

        <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map(({ label, value, detail, icon: MetricIcon }) => {
            return (
              <div key={String(label)} className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-xs">{label}</span>
                  <MetricIcon className="size-4" />
                </div>
                <p className="mt-3 text-2xl font-semibold tracking-tight">{value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
              </div>
            );
          })}
        </section>

        <section className="mt-5 rounded-xl border border-border bg-card p-4 sm:p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold">Learning activity</h2>
              <p className="mt-1 text-xs text-muted-foreground">Your consistency over the last year</p>
            </div>
            <span className="text-xs text-muted-foreground">{progress.activeDays} active days</span>
          </div>
          <div className="mt-4 flex gap-1.5 overflow-hidden">
            {Array.from({ length: 52 }, (_, week) => (
              <div key={week} className="grid shrink-0 gap-1" style={{ gridTemplateRows: "repeat(7, 10px)" }}>
                {Array.from({ length: 7 }, (_, day) => {
                  const date = new Date();
                  date.setDate(date.getDate() - ((51 - week) * 7 + (6 - day)));
                    const dateKey = date.toISOString().slice(0, 10);
                    const level = activityLevels[dateKey] ?? 0;
                    const shade = level >= 3 ? "bg-primary" : level >= 2 ? "bg-primary/60" : level === 1 ? "bg-primary/30" : "bg-muted";
                    return <span key={day} title={level ? `${level} learning ${level === 1 ? "activity" : "activities"}` : "No learning activity"} className={`size-2.5 rounded-[3px] ${shade}`} />;
                })}
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Less</span>
            <span className="flex items-center gap-1">
              <span className="size-2.5 rounded-[3px] bg-muted" />
              <span className="size-2.5 rounded-[3px] bg-primary/40" />
              <span className="size-2.5 rounded-[3px] bg-primary" />
              More
            </span>
          </div>
        </section>

        {progress.nextUp && (
          <section className="mt-8 overflow-hidden rounded-2xl border border-primary/20 bg-primary/[0.06] p-6 sm:p-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm font-medium text-primary">
                  <Play className="size-4 fill-current" /> Next up
                </div>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight">{progress.nextUp.chapterTitle ?? progress.nextUp.courseTitle}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{progress.nextUp.courseTitle} · {progress.nextUp.percent}% complete</p>
              </div>
              <Button asChild size="lg">
                <Link href={progress.nextUp.chapterId ? `/learn/${progress.nextUp.courseId}?chapter=${progress.nextUp.chapterId}` : `/learn/${progress.nextUp.courseId}`}>
                  Continue learning <ArrowRight className="ml-2 size-4" />
                </Link>
              </Button>
            </div>
          </section>
        )}

        <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px]">
          <section>
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold tracking-tight">Course mastery</h2>
                <p className="mt-1 text-sm text-muted-foreground">A clear view of how far each course has taken you.</p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {progress.courseProgress.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-8 text-center">
                  <BookOpen className="mx-auto size-6 text-muted-foreground" />
                  <p className="mt-3 text-sm font-medium">Your first lesson is waiting.</p>
                  <Button asChild variant="outline" size="sm" className="mt-4"><Link href="/learn">Explore courses</Link></Button>
                </div>
              ) : progress.courseProgress.map((course) => (
                <div key={course.courseId} className="rounded-xl border border-border bg-card p-5">
                  <div className="flex items-start gap-4">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-semibold text-muted-foreground">
                      {initials(course.courseTitle)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3 className="font-medium">{course.courseTitle}</h3>
                          <p className="mt-1 text-xs text-muted-foreground">{course.completedChapters} of {course.totalChapters} chapters complete</p>
                        </div>
                        <span className="text-sm font-semibold">{course.percent}%</span>
                      </div>
                      <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${course.percent}%` }} />
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                        <span>{course.nextChapter ? `Next: ${course.nextChapter}` : "Course complete"}</span>
                        <Link className="font-medium text-foreground hover:text-primary" href={course.nextChapterId ? `/learn/${course.courseId}?chapter=${course.nextChapterId}` : `/learn/${course.courseId}`}>
                          {course.nextChapter ? "Resume" : "Review"}
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <aside className="space-y-8">
            <section>
              <div className="flex items-end justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold tracking-tight">Milestones</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{unlockedMilestones} of {progress.milestones.length} unlocked</p>
                </div>
                <Award className="size-5 text-primary" />
              </div>
              <div className="mt-5 space-y-2">
                {progress.milestones.map((milestone) => (
                  <div key={milestone.id} className={`flex items-center gap-3 rounded-xl border p-3 ${milestone.unlocked ? "border-primary/20 bg-primary/[0.06]" : "border-border opacity-60"}`}>
                    <div className={`flex size-9 shrink-0 items-center justify-center rounded-full ${milestone.unlocked ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                      {milestone.unlocked ? <CheckCircle2 className="size-4" /> : <Award className="size-4" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{milestone.label}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{milestone.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold tracking-tight">Recent activity</h2>
              <div className="mt-5 space-y-4">
                {progress.recentActivity.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Your activity will appear here after your first lesson.</p>
                ) : progress.recentActivity.map((activity) => (
                  <Link key={activity.id} href={`/learn/${activity.courseId}?chapter=${activity.chapterId}`} className="group flex gap-3">
                    <div className={`mt-1 flex size-7 shrink-0 items-center justify-center rounded-full ${activity.completed ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                      {activity.completed ? <CheckCircle2 className="size-3.5" /> : <Play className="size-3.5" />}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium group-hover:text-primary">{activity.chapterTitle}</p>
                      <p className="truncate text-xs text-muted-foreground">{activity.courseTitle} · {activity.completed ? "Completed" : formatWatchTime(activity.watchedSeconds)}</p>
                      <time className="mt-1 block text-[11px] text-muted-foreground">{formatDate(activity.updatedAt)}</time>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
