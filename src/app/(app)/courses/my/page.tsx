"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { BookOpen, Pencil, Plus, Trash2 } from "lucide-react";

type Course = {
  id: string;
  title: string;
  description: string | null;
  published: boolean;
  coverImageUrl: string | null;
  chapters: {
    id: string;
    title: string;
  }[];
  categories: {
    category: {
      id: string;
      name: string;
    };
  }[];
};

export default function MyCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState<Course | null>(null);

  useEffect(() => {
    fetchCourses();
  }, []);

  async function fetchCourses() {
    try {
      const res = await fetch("/api/courses/my");

      if (!res.ok) {
        throw new Error("Failed to fetch courses");
      }

      const data = await res.json();
      setCourses(data.data ?? data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!courseToDelete) return;

    try {
      setDeleting(true);

      const res = await fetch(`/api/courses/${courseToDelete.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to delete course");
      }

      setCourses((prev) =>
        prev.filter((course) => course.id !== courseToDelete.id),
      );

      setCourseToDelete(null);
    } catch (error) {
      console.error(error);
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-8 space-y-2">
          <div className="h-7 w-32 animate-pulse rounded bg-muted" />
          <div className="h-4 w-64 animate-pulse rounded bg-muted" />
        </div>

        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mx-auto max-w-5xl px-6 py-10">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              My courses
            </h1>

            <p className="mt-1 text-sm text-muted-foreground">
              Manage your courses and content.
            </p>
          </div>

          <Link href="/courses/new">
            <Button asChild size="sm">
              <Plus className="mr-2 h-4 w-4" />
              New course
            </Button>
          </Link>
        </div>

        {/* Empty */}
        {courses.length === 0 ? (
          <div className="flex min-h-60 flex-col items-center justify-center rounded-xl bg-muted/40 px-6 text-center">
            <BookOpen className="mb-3 h-8 w-8 text-muted-foreground" />

            <p className="text-sm font-medium">No courses yet</p>

            <p className="mt-1 text-sm text-muted-foreground">
              Create your first course to get started.
            </p>

            <Link href="/courses/create">
              <Button asChild size="sm" className="mt-4" variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Create course
              </Button>
            </Link>
          </div>
        ) : (
          /* Course list */
          <div className="space-y-3">
            {courses.map((course) => (
              <div
                key={course.id}
                className="group flex min-h-[150px] overflow-hidden rounded-xl bg-muted/30 transition-colors hover:bg-muted/50"
              >
                {/* Image */}
                <div className="w-56 shrink-0 bg-muted">
                  {course.coverImageUrl ? (
                    <img
                      src={course.coverImageUrl}
                      alt={course.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <BookOpen className="h-8 w-8 text-muted-foreground/50" />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex min-w-0 flex-1 flex-col justify-between p-5">
                  <div>
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h2 className="truncate text-base font-medium">
                          {course.title}
                        </h2>

                        {course.description && (
                          <p className="mt-1 line-clamp-2 max-w-2xl text-sm text-muted-foreground">
                            {course.description}
                          </p>
                        )}
                      </div>

                      <Badge
                        variant={course.published ? "default" : "secondary"}
                        className="shrink-0 font-normal"
                      >
                        {course.published ? "Published" : "Draft"}
                      </Badge>
                    </div>

                    {/* Meta */}
                    <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
                      <span>
                        {course.chapters.length}{" "}
                        {course.chapters.length === 1 ? "chapter" : "chapters"}
                      </span>

                      {course.categories.length > 0 && (
                        <>
                          <span>·</span>

                          <span className="truncate">
                            {course.categories
                              .map(({ category }) => category.name)
                              .join(", ")}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-4 flex items-center gap-2">
                    <Link href={`/courses/${course.id}`}>
                      <Button asChild size="sm" variant="outline">
                        <Pencil className="mr-2 h-3.5 w-3.5" />
                        Manage
                      </Button>
                    </Link>

                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setCourseToDelete(course)}
                    >
                      <Trash2 className="mr-2 h-3.5 w-3.5" />
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      <AlertDialog
        open={!!courseToDelete}
        onOpenChange={(open) => {
          if (!open && !deleting) {
            setCourseToDelete(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete course?</AlertDialogTitle>

            <AlertDialogDescription>
              This will permanently delete{" "}
              <span className="font-medium text-foreground">
                {courseToDelete?.title}
              </span>
              . This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>

            <AlertDialogAction onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
