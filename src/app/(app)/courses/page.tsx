"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

import {
  Plus,
  Star,
  Search,
  BookOpen,
  TriangleAlert,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { canManageCourses } from "@/core/permissions";

type CourseListItem = {
  id: string;
  title: string;
  description: string | null;
  published: boolean;
  coverImageUrl: string | null;
  canEdit: boolean;
  chapters: unknown[];
  categories: Array<{ category: { name: string } }>;
  updatedAt?: string;
  studentsCount?: number;
};

type SortKey = "newest" | "title" | "chapters";
type StatusFilter = "all" | "published" | "draft";

const SORT_OPTIONS: SortKey[] = ["newest", "title", "chapters"];

function initials(title: string) {
  const words = title.trim().split(/\s+/);

  if (words.length === 0 || !words[0]) return "?";

  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }

  return `${words[0][0] ?? ""}${words[1]?.[0] ?? ""}`.toUpperCase();
}

export default function CoursesPage() {
  const { data: session } = useSession();
  const manager = canManageCourses(session?.user?.roles ?? []);

  const [courses, setCourses] = useState<CourseListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("newest");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [showOnlyMine, setShowOnlyMine] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/courses");
        const json = await res.json();

        if (!res.ok || !json.success) {
          throw new Error("Failed to load courses");
        }

        if (!cancelled) setCourses(json.data);
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Error loading courses");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const visible = useMemo(() => {
    let list = [...courses];

    if (showOnlyMine) list = list.filter((c) => c.canEdit);

    if (statusFilter !== "all") {
      list = list.filter((c) =>
        statusFilter === "published" ? c.published : !c.published,
      );
    }

    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((c) =>
        c.title.toLowerCase().includes(q) ||
        (c.description?.toLowerCase() ?? "").includes(q),
      );
    }

    switch (sortKey) {
      case "title":
        list.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case "chapters":
        list.sort((a, b) => b.chapters.length - a.chapters.length);
        break;
      case "newest":
      default:
        list.sort(
          (a, b) =>
            new Date(b.updatedAt ?? 0).getTime() -
            new Date(a.updatedAt ?? 0).getTime(),
        );
    }

    return list;
  }, [courses, query, sortKey, statusFilter, showOnlyMine]);

  return (
    <div className="min-h-screen w-full bg-background text-foreground">
      <div className="mx-auto max-w-6xl space-y-6 px-6 py-10">

        {/* HEADER (UNCHANGED LOGIC) */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="size-5" />
            <h1 className="text-2xl font-bold">Courses</h1>
          </div>

          {manager && (
            <Link href="/courses/new">
              <Button >
                <Plus className="size-4" />
                New course
              </Button>

            </Link>
          )}
        </div>

        {/* TOOLBAR (FIXED BUT SAFE) */}
        <Card className="p-4">
          <div className="flex flex-wrap items-center gap-3">

            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search courses..."
                className="pl-9"
              />
            </div>

            <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="title">Title A–Z</SelectItem>
                <SelectItem value="chapters">Most chapters</SelectItem>
              </SelectContent>
            </Select>

            {manager && (
              <Select
                value={statusFilter}
                onValueChange={(v) => setStatusFilter(v as StatusFilter)}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                </SelectContent>
              </Select>
            )}

            {manager && (
              <Button
                variant={showOnlyMine ? "default" : "outline"}
                onClick={() => setShowOnlyMine((v) => !v)}
              >
                <Star className="size-4" />
                Mine
              </Button>
            )}

          </div>
        </Card>

        {/* ERROR */}
        {error && (
          <Card className="p-4 flex items-center gap-2 text-destructive">
            <TriangleAlert className="size-4" />
            {error}
          </Card>
        )}

        {/* LIST (UNCHANGED STRUCTURE) */}
        {!loading && !error && (
          <div className="space-y-3">
            {visible.map((course) => (
              <Card key={course.id} className="p-4">
                <div className="flex items-start justify-between gap-4">

                  {/* LEFT */}
                  <div className="flex gap-3 min-w-0">

                    <div className="flex size-10 min-w-10 items-center justify-center rounded-md bg-muted text-sm font-semibold">
                      {initials(course.title)}
                    </div>

                    <div className="min-w-0">
                      <p className="font-medium truncate">
                        {course.title}
                      </p>

                      <p className="text-sm text-muted-foreground truncate">
                        {course.description || "No description"}
                      </p>

                      <div className="flex gap-2 mt-1 flex-wrap">
                        {course.categories.map((c) => (
                          <Badge key={c.category.name} variant="secondary">
                            {c.category.name}
                          </Badge>
                        ))}
                      </div>
                    </div>

                  </div>

                  {/* RIGHT */}
                  <div className="flex items-center gap-2 flex-shrink-0">

                    <Button variant="outline" size="sm">
                      <Link href={`/courses/${course.id}`}>Open</Link>
                    </Button>

                    {course.canEdit && (
                      <Button size="sm">
                        <Link href={`/courses/${course.id}/edit`}>Edit</Link>
                      </Button>
                    )}

                  </div>

                </div>
              </Card>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}