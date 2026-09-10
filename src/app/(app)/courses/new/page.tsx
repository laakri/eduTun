// app/courses/new/page.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ImagePlus, Loader2, X } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

// API error bodies aren't consistent across handlers/frameworks, so try the
// common shapes before giving up: `message`, `error` (string or object),
// or an `errors` array of strings / { message } objects.
function extractErrorMessage(body: unknown, res: Response): string {
  if (body && typeof body === "object") {
    const b = body as Record<string, unknown>;

    if (typeof b.message === "string" && b.message.trim()) return b.message;

    if (typeof b.error === "string" && b.error.trim()) return b.error;
    if (
      b.error &&
      typeof b.error === "object" &&
      typeof (b.error as Record<string, unknown>).message === "string"
    ) {
      return (b.error as Record<string, unknown>).message as string;
    }

    if (Array.isArray(b.errors) && b.errors.length > 0) {
      const first = b.errors[0];
      if (typeof first === "string") return first;
      if (
        first &&
        typeof first === "object" &&
        typeof (first as Record<string, unknown>).message === "string"
      ) {
        return (first as Record<string, unknown>).message as string;
      }
    }
  }

  return `Couldn't create the course (${res.status} ${res.statusText}).`;
}

type CategoryOption = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  children?: CategoryOption[];
};

const DESCRIPTION_LIMIT = 400;

export default function NewCoursePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [parentCategoryId, setParentCategoryId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [tagsInput, setTagsInput] = useState("");

  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Local-only cover preview. This does not upload anywhere yet — wire
  // handleCoverChange up to your storage endpoint when that's ready.
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadCategories() {
      try {
        const res = await fetch("/api/categories");
        const raw = await res.text();

        if (!res.ok) {
          console.error(
            `GET /api/categories failed (${res.status} ${res.statusText}):`,
            raw,
          );
          if (!cancelled) {
            setCategoriesError(
              `Couldn't load categories (${res.status}). Check the console for details.`,
            );
          }
          return;
        }

        let body: unknown;
        try {
          body = raw ? JSON.parse(raw) : null;
        } catch {
          console.error("GET /api/categories returned non-JSON body:", raw);
          if (!cancelled)
            setCategoriesError("Categories response wasn't valid JSON.");
          return;
        }

        // Tolerate either a bare array or a wrapped `{ categories: [...] }` shape.
        const response = body as
          | CategoryOption[]
          | { categories?: CategoryOption[]; data?: CategoryOption[] }
          | null;
        const data: CategoryOption[] = Array.isArray(response)
          ? response
          : (response?.categories ?? response?.data ?? []);

        if (data.length === 0) {
          console.warn(
            "GET /api/categories returned 0 categories or an unexpected shape:",
            body,
          );
        }

        if (!cancelled) {
          setCategories(data);
          setCategoriesError(null);
        }
      } catch (err) {
        console.error("GET /api/categories threw:", err);
        if (!cancelled) {
          setCategoriesError(
            "Couldn't reach the categories endpoint. Check the console/network tab.",
          );
        }
      }
    }

    loadCategories();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedParentCategory = categories.find(
    (category) => category.id === parentCategoryId,
  );
  const subjectCategories = selectedParentCategory
    ? selectedParentCategory.children?.length
      ? selectedParentCategory.children
      : [selectedParentCategory]
    : [];

  function handleParentCategoryChange(value: string) {
    setParentCategoryId(value);
    setCategoryId("");
  }

  function readCoverFile(file: File | undefined) {
    if (!file || !file.type.startsWith("image/")) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("Cover image must be 5 MB or smaller.");
      return;
    }
    setCoverFile(file);
    setUploading(true);
    const reader = new FileReader();
    reader.onload = () => {
      setCoverPreview(reader.result as string);
      setUploading(false);
    };
    reader.readAsDataURL(file);
  }

  const tagList = tagsInput
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!title.trim()) {
      setError("Give the course a title before continuing.");
      return;
    }

    if (!parentCategoryId || !categoryId) {
      setError("Choose a program and a specific subject before continuing.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const tags = tagsInput
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    try {
      const res = await fetch("/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          categoryId,
          tags,
        }),
      });

      if (!res.ok) {
        const raw = await res.text();
        console.error(
          `POST /api/courses failed (${res.status} ${res.statusText}):`,
          raw,
        );

        let body: unknown = null;
        try {
          body = raw ? JSON.parse(raw) : null;
        } catch {
          // Body wasn't JSON — extractErrorMessage falls back to status text.
        }

        throw new Error(extractErrorMessage(body, res));
      }

      const responseBody = await res.json();
      // `ok()` may return the course bare, or wrapped as `{ data: course }` /
      // `{ course }` / `{ success: true, data: course }` — support all of them.
      const course = responseBody?.id
        ? responseBody
        : responseBody?.data?.id
          ? responseBody.data
          : responseBody?.course?.id
            ? responseBody.course
            : null;

      if (!course?.id) {
        console.error(
          "POST /api/courses succeeded but no course.id found in response:",
          responseBody,
        );
        throw new Error(
          "Course was created, but the response didn't include its id.",
        );
      }

      // The course must exist before Bunny Storage can receive a stable,
      // course-scoped key. Uploading here keeps the create flow atomic from
      // the professor's perspective: details, then cover, then chapters.
      if (coverFile) {
        const coverForm = new FormData();
        coverForm.set("file", coverFile);
        const coverResponse = await fetch(`/api/courses/${course.id}/cover`, {
          method: "POST",
          body: coverForm,
        });
        if (!coverResponse.ok) {
          const body = await coverResponse.json().catch(() => null);
          throw new Error(
            body?.error?.message ??
              "Course created, but the Bunny cover upload failed.",
          );
        }
      }

      router.push(`/courses/${course.id}/chapters/new`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong. Try again.",
      );
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl py-8">
      <Link
        href="/courses"
        className="mb-6 inline-flex items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Courses
      </Link>

      {/* Step indicator */}
      <div className="mb-3 flex items-center gap-2 text-[12px] text-muted-foreground">
        <span className="flex items-center gap-1.5 text-primary">
          <span className="flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
            1
          </span>
          Details
        </span>
        <span className="h-px w-6 bg-border" />
        <span className="flex items-center gap-1.5">
          <span className="flex size-4 items-center justify-center rounded-full border border-border text-[10px] font-medium">
            2
          </span>
          Chapters
        </span>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl font-medium text-foreground">
          Let&apos;s set up your course
        </h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Add the basics now — you can refine everything later, and you&apos;ll
          add chapters next.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-8">
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
          {/* Cover image */}
          <div>
            <label className="mb-2 block text-[13px] text-foreground/70">
              Cover image
            </label>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragActive(false);
                readCoverFile(e.dataTransfer.files?.[0]);
              }}
              className={cn(
                "group relative flex aspect-[21/9] w-full items-center justify-center overflow-hidden rounded-lg border border-dashed transition-colors",
                dragActive
                  ? "border-primary bg-primary/5"
                  : "border-border bg-muted/40 hover:bg-muted/60",
              )}
            >
              {coverPreview ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={coverPreview}
                    alt=""
                    className="size-full object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover:bg-black/40 group-hover:opacity-100">
                    <span className="text-[13px] text-white">Change cover</span>
                  </div>
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCoverPreview(null);
                      setCoverFile(null);
                    }}
                    className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity hover:bg-black/70 group-hover:opacity-100"
                  >
                    <X className="size-3.5" />
                  </span>
                </>
              ) : uploading ? (
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <ImagePlus className="size-5" />
                  <span className="text-[13px]">
                    Drop an image, or click to browse
                  </span>
                  <span className="text-[11px] text-muted-foreground/70">
                    Recommended 1280×550
                  </span>
                </div>
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => readCoverFile(e.target.files?.[0])}
            />
          </div>

          {/* Title */}
          <div className="mt-7">
            <label
              htmlFor="title"
              className="mb-2 block text-[13px] text-foreground/70"
            >
              Title
            </label>
            <input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Bac Physics — Mechanics"
              className="w-full border-b border-input bg-transparent pb-2 text-xl text-foreground outline-none transition-colors placeholder:text-muted-foreground/40 focus:border-primary"
            />
          </div>

          {/* Description */}
          <div className="mt-7">
            <div className="mb-2 flex items-center justify-between">
              <label
                htmlFor="description"
                className="block text-[13px] text-foreground/70"
              >
                Description
              </label>
              <span className="text-[11px] text-muted-foreground/70">
                {description.length}/{DESCRIPTION_LIMIT}
              </span>
            </div>
            <textarea
              id="description"
              value={description}
              onChange={(e) =>
                setDescription(e.target.value.slice(0, DESCRIPTION_LIMIT))
              }
              rows={4}
              placeholder="What will students learn in this course?"
              className="w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-[14px] leading-relaxed text-foreground outline-none transition-colors placeholder:text-muted-foreground/40 focus:border-primary focus:ring-2 focus:ring-ring/30"
            />
          </div>

          {/* Category + tags */}
          <div className="mt-7 grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label
                htmlFor="category"
                className="mb-2 block text-[13px] text-foreground/70"
              >
                Category
              </label>
              <select
                id="category"
                value={parentCategoryId}
                onChange={(e) => handleParentCategoryChange(e.target.value)}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-[14px] text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-ring/30"
              >
                <option value="">Choose a program</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              {categoriesError && (
                <p className="mt-1 text-[11px] text-destructive">
                  {categoriesError}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="subject"
                className="mb-2 block text-[13px] text-foreground/70"
              >
                Subject
              </label>
              <select
                id="subject"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                disabled={!parentCategoryId || subjectCategories.length === 0}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-[14px] text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="">
                  {parentCategoryId
                    ? subjectCategories.length > 0
                      ? "Choose a subject"
                      : "No subjects available"
                    : "Choose a program first"}
                </option>
                {subjectCategories.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-muted-foreground/70">
                Choose the specific subject this course teaches.
              </p>
            </div>

            <div>
              <label
                htmlFor="tags"
                className="mb-2 block text-[13px] text-foreground/70"
              >
                Tags
              </label>
              <input
                id="tags"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="algebra, exam-prep"
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-[14px] text-foreground outline-none transition-colors placeholder:text-muted-foreground/40 focus:border-primary focus:ring-2 focus:ring-ring/30"
              />
              {tagList.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {tagList.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-secondary px-2 py-0.5 text-[11px] text-secondary-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-1 text-[11px] text-muted-foreground/70">
                  Separate with commas
                </p>
              )}
            </div>
          </div>
        </div>

        {error && (
          <p className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-[13px] text-destructive">
            {error}
          </p>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={submitting || uploading}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-[13px] font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting && <Loader2 className="size-3.5 animate-spin" />}
            Continue to chapters
          </button>

          <Link
            href="/courses"
            className="text-[13px] text-muted-foreground transition-colors hover:text-foreground"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
