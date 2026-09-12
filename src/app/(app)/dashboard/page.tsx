"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, BookOpen, CheckCircle2, Clock3, Loader2, Plus, Users, Video } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type DashboardData = {
  user: { fullName: string };
  stats: { courses: number; publishedCourses: number; students: number; chapters: number; hours: number };
  learning: { progressEntries: number; completedEntries: number; completionRate: number; activeLearnersLast7Days: number };
  courses: Array<{ id: string; title: string; description: string | null; published: boolean; chapters: number; students: number; readyChapters: number; updatedAt: string }>;
  activity: Array<{ id: string; title: string; description: string; createdAt: string }>;
};

function relativeTime(value: string) {
  const minutes = Math.max(1, Math.round((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/dashboard/professor")
      .then(async (response) => {
        const json = await response.json();
        if (!response.ok) throw new Error(json.error?.message ?? "Could not load dashboard.");
        setData(json.data);
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Could not load dashboard."));
  }, []);

  if (error) return <div className="py-16 text-sm text-destructive">{error}</div>;
  if (!data) return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>;

  const stats = [
    ["Courses", data.stats.courses, `${data.stats.publishedCourses} published`, BookOpen],
    ["Students", data.stats.students, "Across active learning", Users],
    ["Chapters", data.stats.chapters, "Across all courses", Video],
    ["Content", `${data.stats.hours}h`, "Video duration", Clock3],
  ] as const;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Professor workspace</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">Good to see you, {data.user.fullName}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Here is the current pulse of your courses.</p>
        </div>
        <Button asChild size="sm"><Link href="/courses/new"><Plus className="size-4" />New course</Link></Button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map(([label, value, detail, Icon]) => (
          <Card key={label} className="p-4">
            <div className="flex items-center justify-between"><span className="text-xs text-muted-foreground">{label}</span><Icon className="size-4 text-muted-foreground" /></div>
            <p className="mt-2 text-xl font-semibold">{value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
          </Card>
        ))}
      </div>

      <section>
        <div className="mb-3">
          <h2 className="text-sm font-semibold">Learning pulse</h2>
          <p className="mt-1 text-xs text-muted-foreground">How learners are moving through your published content.</p>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <Card className="p-4">
            <div className="flex items-center justify-between"><span className="text-xs text-muted-foreground">Completion rate</span><CheckCircle2 className="size-4 text-muted-foreground" /></div>
            <p className="mt-2 text-xl font-semibold">{data.learning.completionRate}%</p>
            <p className="mt-1 text-xs text-muted-foreground">{data.learning.completedEntries} of {data.learning.progressEntries} lessons completed</p>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between"><span className="text-xs text-muted-foreground">Active this week</span><Users className="size-4 text-muted-foreground" /></div>
            <p className="mt-2 text-xl font-semibold">{data.learning.activeLearnersLast7Days}</p>
            <p className="mt-1 text-xs text-muted-foreground">Learners active in the last 7 days</p>
          </Card>
          <Card className="p-4 col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between"><span className="text-xs text-muted-foreground">Tracked learning</span><BookOpen className="size-4 text-muted-foreground" /></div>
            <p className="mt-2 text-xl font-semibold">{data.learning.progressEntries}</p>
            <p className="mt-1 text-xs text-muted-foreground">Lesson progress records across your courses</p>
          </Card>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <section className="min-w-0">
          <div className="mb-3 flex items-center justify-between"><div><h2 className="text-sm font-semibold">Your courses</h2><p className="mt-1 text-xs text-muted-foreground">Recently updated content.</p></div><Button variant="ghost" size="sm" asChild><Link href="/courses">View all<ArrowRight className="size-3.5" /></Link></Button></div>
          {data.courses.length === 0 ? <Card className="p-8 text-center"><p className="text-sm font-medium">No courses yet</p><p className="mt-1 text-xs text-muted-foreground">Create your first course to start teaching.</p></Card> : <div className="space-y-2">{data.courses.map((course) => <Card key={course.id} className="p-4 transition-colors hover:bg-muted/30"><div className="flex items-start justify-between gap-4"><div className="flex min-w-0 gap-3"><div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted"><BookOpen className="size-4 text-muted-foreground" /></div><div className="min-w-0"><div className="flex items-center gap-2"><p className="truncate text-sm font-medium">{course.title}</p>{!course.published && <Badge variant="secondary" className="shrink-0 text-[10px]">Draft</Badge>}</div><p className="mt-1 truncate text-xs text-muted-foreground">{course.description || "No description"}</p><div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground"><span>{course.chapters} chapters</span><span>{course.students} students</span><span>{course.readyChapters}/{course.chapters} ready</span></div></div></div><Button variant="ghost" size="sm" asChild className="shrink-0"><Link href={`/courses/${course.id}`}>Open</Link></Button></div></Card>)}</div>}
        </section>

        <section><div className="mb-3"><h2 className="text-sm font-semibold">Recent activity</h2><p className="mt-1 text-xs text-muted-foreground">The latest conversation around your courses.</p></div><Card className="p-4">{data.activity.length === 0 ? <p className="text-sm text-muted-foreground">No recent activity yet.</p> : <div className="space-y-5">{data.activity.map((item) => <div key={item.id} className="flex gap-3"><div className="mt-1 size-2.5 shrink-0 rounded-full bg-primary" /><div><p className="text-sm font-medium">{item.title}</p><p className="mt-0.5 text-xs leading-5 text-muted-foreground">{item.description}</p><p className="mt-1 text-[11px] text-muted-foreground">{relativeTime(item.createdAt)}</p></div></div>)}</div>}</Card></section>
      </div>

      <section><div className="mb-3"><h2 className="text-sm font-semibold">Quick actions</h2><p className="mt-1 text-xs text-muted-foreground">Common things you can do.</p></div><div className="grid gap-2 sm:grid-cols-3"><Link href="/courses/new"><Card className="group p-4 transition-colors hover:bg-muted/50"><div className="flex items-center gap-3"><div className="flex size-9 items-center justify-center rounded-md bg-muted"><Plus className="size-4" /></div><div><p className="text-sm font-medium">Create course</p><p className="mt-0.5 text-xs text-muted-foreground">Start a new course</p></div><ArrowRight className="ml-auto size-4 text-muted-foreground" /></div></Card></Link><Link href="/courses"><Card className="group p-4 transition-colors hover:bg-muted/50"><div className="flex items-center gap-3"><div className="flex size-9 items-center justify-center rounded-md bg-muted"><BookOpen className="size-4" /></div><div><p className="text-sm font-medium">Manage courses</p><p className="mt-0.5 text-xs text-muted-foreground">View and edit courses</p></div><ArrowRight className="ml-auto size-4 text-muted-foreground" /></div></Card></Link><Link href="/students"><Card className="group p-4 transition-colors hover:bg-muted/50"><div className="flex items-center gap-3"><div className="flex size-9 items-center justify-center rounded-md bg-muted"><Users className="size-4" /></div><div><p className="text-sm font-medium">Students</p><p className="mt-0.5 text-xs text-muted-foreground">View your students</p></div><ArrowRight className="ml-auto size-4 text-muted-foreground" /></div></Card></Link></div></section>
    </div>
  );
}
