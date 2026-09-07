"use client";

import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Clock3,
  FileText,
  Plus,
  Users,
  Video,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const stats = {
  courses: 3,
  students: 248,
  chapters: 25,
  hours: 18,
};

const courses = [
  {
    id: "course_001",
    title: "Mathematics — Baccalauréat",
    description:
      "Complete mathematics preparation for the Baccalauréat.",
    chapters: 12,
    students: 142,
    progress: 82,
    published: true,
    updated: "2 hours ago",
  },
  {
    id: "course_002",
    title: "Advanced Algebra",
    description:
      "Algebra fundamentals, equations and advanced problems.",
    chapters: 8,
    students: 76,
    progress: 64,
    published: true,
    updated: "Yesterday",
  },
  {
    id: "course_003",
    title: "Calculus & Analysis",
    description:
      "Limits, derivatives, integrals and applications.",
    chapters: 5,
    students: 30,
    progress: 38,
    published: false,
    updated: "3 days ago",
  },
];

const activity = [
  {
    id: "1",
    title: "New student enrolled",
    description: "Ahmed Trabelsi joined Mathematics — Baccalauréat",
    time: "12 minutes ago",
  },
  {
    id: "2",
    title: "Chapter completed",
    description: "Sarra Ben Salem completed Introduction aux limites",
    time: "1 hour ago",
  },
  {
    id: "3",
    title: "New comment",
    description: "Youssef Mansour commented on Advanced Algebra",
    time: "3 hours ago",
  },
  {
    id: "4",
    title: "Course updated",
    description: "Mathematics — Baccalauréat was updated",
    time: "Yesterday",
  },
];

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">

      {/* HEADER */}

      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">
            Monday, September 7
          </p>

          <h1 className="mt-1 text-2xl font-bold tracking-tight">
            Good afternoon, Mohamed
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Here’s what’s happening with your courses.
          </p>
        </div>

        <Button asChild size="sm">
          <Link href="/courses/new">
            <Plus className="size-4" />
            New course
          </Link>
        </Button>
      </div>

      {/* STATS */}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Courses
            </span>

            <BookOpen className="size-4 text-muted-foreground" />
          </div>

          <p className="mt-2 text-xl font-semibold">
            {stats.courses}
          </p>

          <p className="mt-1 text-xs text-muted-foreground">
            2 published
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Students
            </span>

            <Users className="size-4 text-muted-foreground" />
          </div>

          <p className="mt-2 text-xl font-semibold">
            {stats.students}
          </p>

          <p className="mt-1 text-xs text-muted-foreground">
            +18 this month
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Chapters
            </span>

            <Video className="size-4 text-muted-foreground" />
          </div>

          <p className="mt-2 text-xl font-semibold">
            {stats.chapters}
          </p>

          <p className="mt-1 text-xs text-muted-foreground">
            Across all courses
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Content
            </span>

            <Clock3 className="size-4 text-muted-foreground" />
          </div>

          <p className="mt-2 text-xl font-semibold">
            {stats.hours}h
          </p>

          <p className="mt-1 text-xs text-muted-foreground">
            Video published
          </p>
        </Card>

      </div>

      {/* MAIN */}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">

        {/* COURSES */}

        <section className="min-w-0">

          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold">
                Your courses
              </h2>

              <p className="mt-1 text-xs text-muted-foreground">
                Recently updated courses.
              </p>
            </div>

            <Button variant="ghost" size="sm" asChild>
              <Link href="/courses">
                View all
                <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </div>

          <div className="space-y-2">

            {courses.map((course) => (
              <Card
                key={course.id}
                className="p-4 transition-colors hover:bg-muted/30"
              >
                <div className="flex items-start justify-between gap-4">

                  <div className="flex min-w-0 gap-3">

                    <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted">
                      <BookOpen className="size-4 text-muted-foreground" />
                    </div>

                    <div className="min-w-0">

                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium">
                          {course.title}
                        </p>

                        {!course.published && (
                          <Badge
                            variant="secondary"
                            className="shrink-0 text-[10px]"
                          >
                            Draft
                          </Badge>
                        )}
                      </div>

                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {course.description}
                      </p>

                      <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                        <span>
                          {course.chapters} chapters
                        </span>

                        <span>
                          {course.students} students
                        </span>

                        <span>
                          Updated {course.updated}
                        </span>
                      </div>

                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                    className="shrink-0"
                  >
                    <Link href={`/courses/${course.id}`}>
                      Open
                    </Link>
                  </Button>

                </div>

                {/* COURSE PROGRESS */}

                <div className="mt-3 flex items-center gap-3">
                  <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{
                        width: `${course.progress}%`,
                      }}
                    />
                  </div>

                  <span className="text-[11px] text-muted-foreground">
                    {course.progress}%
                  </span>
                </div>

              </Card>
            ))}

          </div>
        </section>

        {/* ACTIVITY */}

        <section>

          <div className="mb-3">
            <h2 className="text-sm font-semibold">
              Recent activity
            </h2>

            <p className="mt-1 text-xs text-muted-foreground">
              Latest activity from your courses.
            </p>
          </div>

          <Card className="p-4">

            <div className="space-y-5">

              {activity.map((item, index) => (
                <div
                  key={item.id}
                  className="relative flex gap-3"
                >
                  {index !== activity.length - 1 && (
                    <div className="absolute left-[5px] top-5 h-full w-px bg-border" />
                  )}

                  <div className="relative mt-1 size-2.5 shrink-0 rounded-full bg-primary" />

                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {item.title}
                    </p>

                    <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                      {item.description}
                    </p>

                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {item.time}
                    </p>
                  </div>
                </div>
              ))}

            </div>

          </Card>

        </section>
      </div>

      {/* QUICK ACTIONS */}

      <section>

        <div className="mb-3">
          <h2 className="text-sm font-semibold">
            Quick actions
          </h2>

          <p className="mt-1 text-xs text-muted-foreground">
            Common things you can do.
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">

          <Link href="/courses/new">
            <Card className="group p-4 transition-colors hover:bg-muted/50">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-md bg-muted">
                  <Plus className="size-4" />
                </div>

                <div>
                  <p className="text-sm font-medium">
                    Create course
                  </p>

                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Start a new course
                  </p>
                </div>

                <ArrowRight className="ml-auto size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </div>
            </Card>
          </Link>

          <Link href="/courses">
            <Card className="group p-4 transition-colors hover:bg-muted/50">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-md bg-muted">
                  <BookOpen className="size-4" />
                </div>

                <div>
                  <p className="text-sm font-medium">
                    Manage courses
                  </p>

                  <p className="mt-0.5 text-xs text-muted-foreground">
                    View and edit courses
                  </p>
                </div>

                <ArrowRight className="ml-auto size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </div>
            </Card>
          </Link>

          <Link href="/students">
            <Card className="group p-4 transition-colors hover:bg-muted/50">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-md bg-muted">
                  <Users className="size-4" />
                </div>

                <div>
                  <p className="text-sm font-medium">
                    Students
                  </p>

                  <p className="mt-0.5 text-xs text-muted-foreground">
                    View your students
                  </p>
                </div>

                <ArrowRight className="ml-auto size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </div>
            </Card>
          </Link>

        </div>

      </section>

    </div>
  );
}
