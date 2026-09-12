"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, ImagePlus, Loader2, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/toast-provider";

type Category = {
  id: string;
  name: string;
  children?: Category[];
};

type Course = {
  id: string;
  title: string;
  description: string | null;
  coverImageUrl: string | null;
  categories: Array<{ category: Category }>;
};

function getErrorMessage(body: unknown, fallback: string) {
  if (body && typeof body === "object" && "error" in body) {
    const error = body.error;
    if (typeof error === "string") return error;
    if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
      return error.message;
    }
  }

  return fallback;
}

export default function EditCoursePage() {
  const { courseId } = useParams<{ courseId: string }>();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [courseResponse, categoryResponse] = await Promise.all([
          fetch(`/api/courses/${courseId}`),
          fetch("/api/categories"),
        ]);
        const courseJson = await courseResponse.json();
        const categoryJson = await categoryResponse.json();

        if (!courseResponse.ok) {
          throw new Error(getErrorMessage(courseJson, "Could not load course."));
        }
        if (!categoryResponse.ok) {
          throw new Error(getErrorMessage(categoryJson, "Could not load categories."));
        }

        const data: Course = courseJson.data ?? courseJson;
        const categoryData: Category[] = categoryJson.data ?? categoryJson;
        if (!cancelled) {
          setCourse(data);
          setCategories(categoryData);
          setTitle(data.title);
          setDescription(data.description ?? "");
          setCategoryId(data.categories[0]?.category.id ?? "");
        }
      } catch (reason) {
        if (!cancelled) {
          setError(reason instanceof Error ? reason.message : "Could not load course.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [courseId]);

  async function saveCourse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (title.trim().length < 3) {
      setError("Course title must be at least 3 characters.");
      return;
    }
    if (!categoryId) {
      setError("Choose a category for this course.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/courses/${courseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          categoryIds: [categoryId],
        }),
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(getErrorMessage(json, "Could not save course."));
      }

      setCourse((current) =>
        current
          ? { ...current, title: title.trim(), description: description.trim() || null }
          : current,
      );
      setNotice("Course details saved.");
      toast("Course details saved");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save course.");
    } finally {
      setSaving(false);
    }
  }

  async function uploadCover(file: File | undefined) {
    if (!file) return;
    setError("");
    setNotice("");

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Cover must be a JPEG, PNG, or WebP image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Cover image must be 5 MB or smaller.");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch(`/api/courses/${courseId}/cover`, {
        method: "POST",
        body: formData,
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(getErrorMessage(json, "Could not update cover image."));
      }

      setCourse((current) => (current ? { ...current, coverImageUrl: json.data?.coverImageUrl ?? null } : current));
      setNotice("Cover image updated.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not update cover image.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>;
  }

  if (!course) {
    return <div className="mx-auto max-w-2xl px-6 py-16 text-sm text-destructive">{error || "Course not found."}</div>;
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <Button asChild variant="ghost" size="sm" className="-ml-3 mb-3">
            <Link href={`/courses/${courseId}`}><ArrowLeft className="size-4" />Back to course</Link>
          </Button>
          <h1 className="text-3xl font-semibold tracking-tight">Edit course</h1>
          <p className="mt-2 text-sm text-muted-foreground">Keep the course identity clear for students before you publish it.</p>
        </div>
        <Button type="submit" form="course-edit" disabled={saving}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Save
        </Button>
      </div>

      <form id="course-edit" onSubmit={saveCourse} className="space-y-8">
        <section className="space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-semibold">Course details</h2>
              <p className="mt-1 text-sm text-muted-foreground">These details appear on the course page and in search.</p>
            </div>
            <span className="text-xs text-muted-foreground">{title.length}/120</span>
          </div>

          <div className="space-y-2">
            <Label htmlFor="course-title">Title</Label>
            <Input id="course-title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="course-description">Description</Label>
            <textarea id="course-description" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={1000} rows={6} className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring" placeholder="What will students learn?" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="course-category">Category</Label>
            <select id="course-category" value={categoryId} onChange={(event) => setCategoryId(event.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <option value="">Select a category</option>
              {categories.map((category) => (
                <optgroup key={category.id} label={category.name}>
                  {category.children?.length ? category.children.map((child) => <option key={child.id} value={child.id}>{child.name}</option>) : <option value={category.id}>{category.name}</option>}
                </optgroup>
              ))}
            </select>
          </div>
        </section>

        <section className="space-y-4 border-t border-border pt-8">
          <div>
            <h2 className="font-semibold">Course cover</h2>
            <p className="mt-1 text-sm text-muted-foreground">Use a clear image that helps students recognize the course.</p>
          </div>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex aspect-video w-full max-w-xs items-center justify-center overflow-hidden rounded-md border border-border bg-muted">
              {course.coverImageUrl ? <img src={course.coverImageUrl} alt="Course cover" className="size-full object-cover" /> : <ImagePlus className="size-6 text-muted-foreground" />}
            </div>
            <div>
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => void uploadCover(event.target.files?.[0])} />
              <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                {uploading && <Loader2 className="size-4 animate-spin" />}
                {uploading ? "Uploading..." : "Change cover"}
              </Button>
              <p className="mt-2 text-xs text-muted-foreground">JPEG, PNG, or WebP up to 5 MB.</p>
            </div>
          </div>
        </section>

        {(error || notice) && <p className={error ? "text-sm text-destructive" : "text-sm text-primary"} role="status">{error || notice}</p>}
      </form>
    </main>
  );
}