"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock3,
  Download,
  GraduationCap,
  Loader2,
  MoreHorizontal,
  Pencil,
  Play,
  Reply,
  ShieldCheck,
  ThumbsDown,
  ThumbsUp,
  Trash2,
} from "lucide-react";
import VideoPlayer from "@/components/video-player";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type Section = {
  id: string;
  title: string;
  startSeconds: number;
  endSeconds: number;
};

type Resource = {
  id: string;
  title: string;
  sizeBytes: number | null;
};

type Chapter = {
  id: string;
  title: string;
  description: string | null;
  order: number;
  playbackUrl: string | null;
  sections: Section[];
  resources: Resource[];
};

type Course = {
  id: string;
  title: string;
  description: string | null;
  canEdit: boolean;
  owner: {
    fullName: string;
    avatarUrl: string | null;
  };
  chapters: Chapter[];
};

type CourseResponse = {
  data: Course;
};

type Comment = {
  id: string;
  parentId: string | null;
  body: string;
  createdAt: string;
  // Set by the API when the comment has been edited.
  editedAt?: string | null;
  // Set by the API (or optimistically, locally) once the comment has been removed.
  deleted?: boolean;
  isProfessor?: boolean;
  isCourseOwner?: boolean;
  // Whether the current viewer is allowed to edit/delete this comment
  // (author or moderator) — drives whether the "···" menu renders.
  canEdit?: boolean;
  user: {
    fullName: string;
    avatarUrl: string | null;
  };
};

type ChapterFeedback = {
  score: number;
  viewerVote: -1 | 0 | 1;
  comments: Comment[];
};

/**
 * A single comment or reply row with an avatar, name, metadata, and menu,
 * body (static or inline-editing), and a reply action for top-level
 * comments. Shared between top-level comments and replies so the edit/
 * delete/menu logic only lives in one place.
 */
function CommentItem({
  comment,
  isReply = false,
  onReply,
  onSaveEdit,
  onDelete,
}: {
  comment: Comment;
  isReply?: boolean;
  onReply?: () => void;
  onSaveEdit: (commentId: string, body: string) => Promise<void>;
  onDelete: (commentId: string) => Promise<void>;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(comment.body);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
        setConfirmingDelete(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  if (comment.deleted) {
    return (
      <div>
        <div className="flex items-center gap-2">
          <span
            className={
              isReply
                ? "text-xs font-medium italic text-muted-foreground/70"
                : "text-sm font-medium italic text-muted-foreground/70"
            }
          >
            [deleted]
          </span>

          <span className="text-xs text-muted-foreground">·</span>

          <time
            dateTime={comment.createdAt}
            className="text-xs text-muted-foreground"
          >
            {formatCommentDate(comment.createdAt)}
          </time>
        </div>

        <p className="mt-2 text-sm italic text-muted-foreground/60">
          Comment deleted
        </p>
      </div>
    );
  }

  async function handleSave() {
    const trimmed = draft.trim();

    if (!trimmed || trimmed === comment.body) {
      setIsEditing(false);
      setDraft(comment.body);
      return;
    }

    setSaving(true);
    setActionError(null);

    try {
      await onSaveEdit(comment.id, trimmed);
      setIsEditing(false);
    } catch (cause: unknown) {
      setActionError(
        cause instanceof Error ? cause.message : "Could not save changes.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirmDelete() {
    setDeleting(true);
    setActionError(null);

    try {
      await onDelete(comment.id);
      setMenuOpen(false);
      setConfirmingDelete(false);
    } catch (cause: unknown) {
      setActionError(
        cause instanceof Error ? cause.message : "Could not delete comment.",
      );
      setDeleting(false);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <Avatar
          name={comment.user.fullName}
          avatarUrl={comment.user.avatarUrl}
          size={isReply ? "sm" : "md"}
        />
        <span
          className={isReply ? "text-xs font-semibold" : "text-sm font-semibold"}
        >
          {comment.user.fullName}
        </span>

        {comment.isCourseOwner && (
          <Tooltip>
            <TooltipTrigger
              type="button"
              aria-label="Course owner"
              className="inline-flex size-5 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-primary transition-colors hover:bg-primary/15"
            >
              <ShieldCheck className="size-3.5" />
            </TooltipTrigger>
            <TooltipContent>Course owner</TooltipContent>
          </Tooltip>
        )}

        {comment.isProfessor && !comment.isCourseOwner && (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-emerald-700 dark:text-emerald-400">
            <GraduationCap className="size-3" />
            Professor
          </span>
        )}

        <span
          className={
            isReply ? "text-[11px] text-muted-foreground" : "text-xs text-muted-foreground"
          }
        >
          ·
        </span>

        <time
          dateTime={comment.createdAt}
          className={
            isReply ? "text-[11px] text-muted-foreground" : "text-xs text-muted-foreground"
          }
        >
          {formatCommentDate(comment.createdAt)}
        </time>

        {comment.editedAt && (
          <span className="text-[11px] text-muted-foreground/70">(edited)</span>
        )}

        {comment.canEdit && !isEditing && (
          <div ref={menuRef} className="relative ml-auto">
            <button
              type="button"
              aria-label="Comment options"
              aria-expanded={menuOpen}
              onClick={() => {
                setMenuOpen((open) => !open);
                setConfirmingDelete(false);
              }}
              className={[
                "flex size-6 items-center justify-center rounded-md transition-colors",
                menuOpen
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              ].join(" ")}
            >
              <MoreHorizontal className="size-3.5" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-8 z-10 w-44 origin-top-right animate-in fade-in-0 zoom-in-95 rounded-xl bg-popover p-1 shadow-[0_4px_16px_-4px_rgba(0,0,0,0.18),0_0_0_1px_rgba(0,0,0,0.04)] duration-100">
                {!confirmingDelete ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditing(true);
                        setDraft(comment.body);
                        setMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-popover-foreground transition-colors hover:bg-muted"
                    >
                      <Pencil className="size-4 text-muted-foreground" />
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => setConfirmingDelete(true)}
                      className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-destructive transition-colors hover:bg-destructive/10"
                    >
                      <Trash2 className="size-4" />
                      Delete
                    </button>
                  </>
                ) : (
                  <div className="p-2">
                    <p className="px-0.5 text-xs font-medium text-foreground">
                      Delete this comment?
                    </p>
                    <p className="mt-0.5 px-0.5 text-xs text-muted-foreground">
                      This can&apos;t be undone.
                    </p>

                    <div className="mt-2.5 flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => setConfirmingDelete(false)}
                        className="h-7 flex-1 rounded-lg text-xs font-medium text-muted-foreground transition-colors hover:bg-muted"
                      >
                        Cancel
                      </button>

                      <button
                        type="button"
                        disabled={deleting}
                        onClick={handleConfirmDelete}
                        className="h-7 flex-1 rounded-lg bg-destructive text-xs font-medium text-destructive-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
                      >
                        {deleting ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {isEditing ? (
        <div className="mt-2 max-w-2xl">
          <div className="overflow-hidden rounded-lg bg-muted/50 transition-colors focus-within:bg-muted">
            <Textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              maxLength={1000}
              rows={3}
              autoFocus
              disabled={saving}
              className="resize-none border-0 bg-transparent px-3 py-2.5 text-sm shadow-none focus-visible:ring-0"
            />

            <div className="flex items-center justify-between px-2.5 pb-2.5">
              <span className="text-[11px] tabular-nums text-muted-foreground">
                {draft.length}/1000
              </span>

              <div className="flex gap-1.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8"
                  disabled={saving}
                  onClick={() => {
                    setIsEditing(false);
                    setDraft(comment.body);
                    setActionError(null);
                  }}
                >
                  Cancel
                </Button>

                <Button
                  type="button"
                  size="sm"
                  className="h-8"
                  disabled={saving || !draft.trim()}
                  onClick={handleSave}
                >
                  {saving ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <p
          className={
            isReply
              ? "mt-1.5 max-w-3xl whitespace-pre-line text-sm leading-6 text-foreground/80"
              : "mt-2 max-w-3xl whitespace-pre-line text-sm leading-6 text-foreground/90"
          }
        >
          {comment.body}
        </p>
      )}

      {actionError && (
        <p className="mt-1.5 text-xs text-destructive">{actionError}</p>
      )}

      {!isReply && onReply && !isEditing && (
        <button
          type="button"
          onClick={onReply}
          className="mt-2 inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Reply className="size-3.5" />
          Reply
        </button>
      )}
    </div>
  );
}

export default function LearnCoursePage() {
  const { courseId } = useParams<{ courseId: string }>();
  const searchParams = useSearchParams();
  const requestedChapter = searchParams.get("chapter");

  const [course, setCourse] = useState<Course | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentBody, setCommentBody] = useState("");
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [replySubmitting, setReplySubmitting] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [viewerVote, setViewerVote] = useState<-1 | 0 | 1>(0);
  const [voteSubmitting, setVoteSubmitting] = useState(false);
  const [collapsedThreads, setCollapsedThreads] = useState<Set<string>>(
    new Set(),
  );

  useEffect(() => {
    let cancelled = false;

    async function loadCourse() {
      try {
        setError(null);

        const response = await fetch(
          `/api/learning/course?courseId=${courseId}`,
        );

        const json: CourseResponse & {
          error?: {
            message?: string;
          };
        } = await response.json();

        if (!response.ok) {
          throw new Error(json.error?.message || "Course unavailable");
        }

        if (cancelled) {
          return;
        }

        const loadedCourse: Course = json.data;

        setCourse(loadedCourse);

        const requestedChapterExists = loadedCourse.chapters.some(
          (item: Chapter) => item.id === requestedChapter,
        );

        setSelectedId(
          requestedChapterExists
            ? requestedChapter
            : (loadedCourse.chapters[0]?.id ?? null),
        );
      } catch (cause: unknown) {
        if (cancelled) {
          return;
        }

        setError(
          cause instanceof Error ? cause.message : "Course unavailable",
        );
      }
    }

    loadCourse();

    return () => {
      cancelled = true;
    };
  }, [courseId, requestedChapter]);

  useEffect(() => {
    if (!selectedId) {
      setComments([]);
      setReplyTo(null);
      setReplyBody("");
      return;
    }

    let cancelled = false;
    setCommentsLoading(true);
    setCommentError(null);

    fetch(`/api/chapters/${selectedId}/feedback`)
      .then(async (response) => {
        const json = await response.json();
        if (!response.ok) {
          throw new Error(json.error?.message || "Could not load comments.");
        }
        if (!cancelled) {
          const feedback: ChapterFeedback = json.data;
          setComments(feedback.comments ?? []);
          setScore(feedback.score ?? 0);
          setViewerVote(feedback.viewerVote ?? 0);
          setCollapsedThreads(new Set());
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setCommentError(
            cause instanceof Error ? cause.message : "Could not load comments.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setCommentsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  async function submitVote(value: 1 | -1) {
    if (!selectedId || voteSubmitting) return;

    setVoteSubmitting(true);
    setCommentError(null);

    try {
      const response = await fetch(`/api/chapters/${selectedId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "vote", value }),
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error?.message || "Could not save your vote.");
      }

      setViewerVote(value);
      setScore((current) => current - viewerVote + value);
    } catch (cause: unknown) {
      setCommentError(
        cause instanceof Error ? cause.message : "Could not save your vote.",
      );
    } finally {
      setVoteSubmitting(false);
    }
  }

  async function submitComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedId || !commentBody.trim() || commentSubmitting) return;

    setCommentSubmitting(true);
    setCommentError(null);

    try {
      const response = await fetch(`/api/chapters/${selectedId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "comment", body: commentBody.trim() }),
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error?.message || "Could not post comment.");
      }

      setComments((current) => [
        { ...json.data.comment, canEdit: true, editedAt: null },
        ...current,
      ]);
      setCommentBody("");
    } catch (cause: unknown) {
      setCommentError(
        cause instanceof Error ? cause.message : "Could not post comment.",
      );
    } finally {
      setCommentSubmitting(false);
    }
  }

  async function submitReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedId || !replyTo || !replyBody.trim() || replySubmitting) return;

    setReplySubmitting(true);
    setCommentError(null);
    try {
      const response = await fetch(`/api/chapters/${selectedId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "comment",
          body: replyBody.trim(),
          parentId: replyTo,
        }),
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error?.message || "Could not post reply.");
      }
      setComments((current) => [
        { ...json.data.comment, canEdit: true, editedAt: null },
        ...current,
      ]);
      setReplyBody("");
      setReplyTo(null);
    } catch (cause: unknown) {
      setCommentError(
        cause instanceof Error ? cause.message : "Could not post reply.",
      );
    } finally {
      setReplySubmitting(false);
    }
  }

  // --- Edit / delete -------------------------------------------------
  // Adjust the endpoint below to whatever route you wire up server-side.
  // Expected contract:
  //   PATCH /api/comments/:commentId  { body: string }
  //     -> { data: { comment: { body, editedAt } } }
  //   DELETE /api/comments/:commentId
  //     -> 204 / { data: { ok: true } }

  async function handleSaveEdit(commentId: string, body: string) {
    const response = await fetch(`/api/comments/${commentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });

    const json = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(json.error?.message || "Could not update comment.");
    }

    setComments((current) =>
      current.map((item) =>
        item.id === commentId
          ? {
              ...item,
              body: json.data?.comment?.body ?? body,
              editedAt: json.data?.comment?.editedAt ?? new Date().toISOString(),
            }
          : item,
      ),
    );
  }

  async function handleDeleteComment(commentId: string) {
    const response = await fetch(`/api/comments/${commentId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const json = await response.json().catch(() => ({}));
      throw new Error(json.error?.message || "Could not delete comment.");
    }

    setComments((current) =>
      current.map((item) =>
        item.id === commentId
          ? {
              ...item,
              body: "[deleted]",
              deleted: true,
              canEdit: false,
              user: { fullName: "[deleted]", avatarUrl: null },
            }
          : item,
      ),
    );
  }

  function toggleThread(commentId: string) {
    setCollapsedThreads((current) => {
      const next = new Set(current);
      if (next.has(commentId)) {
        next.delete(commentId);
      } else {
        next.add(commentId);
      }
      return next;
    });
  }

  const chapter = useMemo<Chapter | null>(() => {
    if (!course || !selectedId) {
      return null;
    }

    return (
      course.chapters.find((item: Chapter) => item.id === selectedId) ?? null
    );
  }, [course, selectedId]);

  const selectedIndex = useMemo(() => {
    if (!course || !selectedId) {
      return 0;
    }

    const index = course.chapters.findIndex(
      (item: Chapter) => item.id === selectedId,
    );

    return index >= 0 ? index : 0;
  }, [course, selectedId]);

  if (error) {
    return (
      <main className="mx-auto max-w-3xl px-5 py-14 sm:px-6">
        <Link
          href="/packs"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          My packs
        </Link>

        <h1 className="mt-8 text-2xl font-semibold tracking-tight">
          {error}
        </h1>

        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Sign in with the account that owns this pack to continue.
        </p>
      </main>
    );
  }

  if (!course) {
    return (
      <main className="flex min-h-[70svh] items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </main>
    );
  }

  const previousChapter =
    selectedIndex > 0 ? course.chapters[selectedIndex - 1] : null;

  const nextChapter =
    selectedIndex < course.chapters.length - 1
      ? course.chapters[selectedIndex + 1]
      : null;

  return (
    <main className="min-h-[calc(100svh-56px)]">
      <div className="mx-auto max-w-[1440px] px-5 py-6 sm:px-8 lg:px-10">
        {/* Top navigation */}
        <div className="flex items-center gap-2 text-sm">
          <Link
            href="/packs"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            My packs
          </Link>

          <ChevronRight className="size-3.5 text-muted-foreground/40" />

          <span className="max-w-[300px] truncate text-foreground/70">
            {course.title}
          </span>
        </div>

        <div className="mt-8 grid gap-12 lg:grid-cols-[minmax(0,1fr)_300px] xl:gap-16">
          {/* Main */}
          <section className="min-w-0">
            {/* Lesson heading */}
            <div className="mb-6">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <span>
                  Chapter {selectedIndex + 1}
                </span>

                <span className="size-1 rounded-full bg-muted-foreground/40" />

                <span>
                  {course.chapters.length} total
                </span>
              </div>

              <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
                {chapter?.title || course.title}
              </h1>

              <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                <Avatar
                  name={course.owner.fullName}
                  avatarUrl={course.owner.avatarUrl}
                  size="sm"
                />
                <span>By</span>
                <span className="font-medium text-foreground">
                  {course.owner.fullName}
                </span>
                <Tooltip>
                  <TooltipTrigger
                    type="button"
                    aria-label="Course owner"
                    className="inline-flex size-5 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-primary"
                  >
                    <ShieldCheck className="size-3.5" />
                  </TooltipTrigger>
                  <TooltipContent>Course owner</TooltipContent>
                </Tooltip>
              </div>

              {chapter?.description && (
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                  {chapter.description}
                </p>
              )}
            </div>

            {/* Video */}
            {chapter?.playbackUrl ? (
              <div className="overflow-hidden rounded-2xl bg-black shadow-sm">
                <VideoPlayer
                  src={chapter.playbackUrl}
                  title={chapter.title}
                  chapters={chapter.sections.map((section: Section) => ({
                    id: section.id,
                    title: section.title,
                    start: section.startSeconds,
                  }))}
                />
              </div>
            ) : (
              <div className="flex aspect-video items-center justify-center rounded-2xl bg-muted">
                <div className="text-center">
                  <Clock3 className="mx-auto size-5 text-muted-foreground" />

                  <p className="mt-3 text-sm font-medium">
                    Video is being prepared
                  </p>

                  <p className="mt-1 text-xs text-muted-foreground">
                    This lesson will be available soon.
                  </p>
                </div>
              </div>
            )}

            {/* Lesson details */}
            <div className="mt-8">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Lesson {selectedIndex + 1}
                  </p>

                  <h2 className="mt-1 text-lg font-semibold tracking-tight">
                    {chapter?.title || "No chapter selected"}
                  </h2>
                </div>

                <div className="flex items-center gap-2">
                  {previousChapter && (
                    <Link
                      href={`/learn/${course.id}/chapters/${previousChapter.id}`}
                      onClick={() => setSelectedId(previousChapter.id)}
                      className="inline-flex h-9 items-center gap-1.5 px-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <ArrowLeft className="size-4" />
                      Previous
                    </Link>
                  )}

                  {nextChapter && (
                    <Link
                      href={`/learn/${course.id}/chapters/${nextChapter.id}`}
                      onClick={() => setSelectedId(nextChapter.id)}
                      className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
                    >
                      Next
                      <ChevronRight className="size-4" />
                    </Link>
                  )}
                </div>
              </div>

              {chapter?.description && (
                <p className="mt-5 max-w-3xl whitespace-pre-line text-sm leading-7 text-muted-foreground">
                  {chapter.description}
                </p>
              )}

              {/* Resources */}
              {chapter && chapter.resources.length > 0 && (
                <div className="mt-8">
                  <div className="flex items-center gap-2">
                    <Download className="size-4 text-muted-foreground" />
                    <h3 className="text-sm font-semibold">Resources</h3>
                  </div>

                  <div className="mt-3 max-w-2xl">
                    {chapter.resources.map((resource: Resource) => (
                      <div
                        key={resource.id}
                        className="group flex items-center justify-between gap-4 py-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {resource.title}
                          </p>

                          {resource.sizeBytes !== null && (
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {formatBytes(resource.sizeBytes)}
                            </p>
                          )}
                        </div>

                        <button
                          type="button"
                          className="shrink-0 text-sm font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100"
                        >
                          Download
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            
          {/* Discussion */}
          <section className="my-10">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold tracking-tight">Discussion</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Questions, ideas, and discussion about this lesson.
                </p>
              </div>

              <span className="shrink-0 text-xs text-muted-foreground">
                {comments.length} {comments.length === 1 ? "comment" : "comments"}
              </span>
            </div>

            {/* Video rating */}
            <div className="mt-6 flex items-center gap-3">
              <div className="flex items-center rounded-lg bg-muted/50 p-1">
                <button
                  type="button"
                  aria-label="Like this video"
                  title="Like"
                  disabled={voteSubmitting}
                  onClick={() => submitVote(1)}
                  className={[
                    "flex size-8 items-center justify-center rounded-md transition-colors",
                    viewerVote === 1
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-background hover:text-foreground",
                  ].join(" ")}
                >
                  <ThumbsUp
                    className={[
                      "size-4",
                      viewerVote === 1 ? "fill-current" : "",
                    ].join(" ")}
                  />
                </button>

                <span
                  className={[
                    "min-w-8 text-center text-xs font-semibold tabular-nums",
                    viewerVote === 1
                      ? "text-primary"
                      : viewerVote === -1
                        ? "text-destructive"
                        : "text-muted-foreground",
                  ].join(" ")}
                >
                  {score}
                </span>

                <button
                  type="button"
                  aria-label="Dislike this video"
                  title="Dislike"
                  disabled={voteSubmitting}
                  onClick={() => submitVote(-1)}
                  className={[
                    "flex size-8 items-center justify-center rounded-md transition-colors",
                    viewerVote === -1
                      ? "bg-destructive/10 text-destructive"
                      : "text-muted-foreground hover:bg-background hover:text-foreground",
                  ].join(" ")}
                >
                  <ThumbsDown
                    className={[
                      "size-4",
                      viewerVote === -1 ? "fill-current" : "",
                    ].join(" ")}
                  />
                </button>
              </div>

              <span className="text-xs text-muted-foreground">
                Rate this lesson
              </span>
            </div>

            {/* Comment composer */}
            <form onSubmit={submitComment} className="mt-6">
              <div className="overflow-hidden rounded-lg bg-muted/50 transition-colors focus-within:bg-muted">
                <Textarea
                  value={commentBody}
                  onChange={(event) => setCommentBody(event.target.value)}
                  placeholder="What are your thoughts?"
                  maxLength={1000}
                  rows={3}
                  disabled={commentSubmitting}
                  className="min-h-[88px] resize-none border-0 bg-transparent px-4 py-3 text-sm shadow-none focus-visible:ring-0"
                />

                <div className="flex items-center justify-between px-3 pb-2.5">
                  <span className="text-[11px] tabular-nums text-muted-foreground">
                    {commentBody.length}/1000
                  </span>

                  <Button
                    type="submit"
                    size="sm"
                    disabled={!commentBody.trim() || commentSubmitting}
                    className="h-8 rounded-md px-3"
                  >
                    {commentSubmitting ? "Posting..." : "Comment"}
                  </Button>
                </div>
              </div>
            </form>

            {commentError && (
              <p className="mt-3 text-sm text-destructive">{commentError}</p>
            )}

            {/* Comments */}
            <div className="mt-8">
              {commentsLoading ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  Loading discussion...
                </div>
              ) : comments.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-sm font-medium">No comments yet</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Be the first to start the discussion.
                  </p>
                </div>
              ) : (
                <div className="space-y-8">
                  {comments
                    .filter((comment: Comment) => !comment.parentId)
                    .map((comment: Comment) => {
                      const replies = comments.filter(
                        (reply: Comment) => reply.parentId === comment.id,
                      );
                      const collapsed = collapsedThreads.has(comment.id);

                      return (
                        <article key={comment.id}>
                          {/* Comment */}
                          <CommentItem
                            comment={comment}
                            onReply={() => {
                              setReplyTo((current) =>
                                current === comment.id ? null : comment.id,
                              );
                              setReplyBody("");
                            }}
                            onSaveEdit={handleSaveEdit}
                            onDelete={handleDeleteComment}
                          />

                          {/* Reply composer */}
                          {replyTo === comment.id && (
                            <form
                              onSubmit={submitReply}
                              className="mt-3 max-w-2xl"
                            >
                              <div className="overflow-hidden rounded-lg bg-muted/50">
                                <Textarea
                                  value={replyBody}
                                  onChange={(event) =>
                                    setReplyBody(event.target.value)
                                  }
                                  placeholder={`Reply to ${comment.user.fullName}...`}
                                  maxLength={1000}
                                  rows={3}
                                  disabled={replySubmitting}
                                  autoFocus
                                  className="resize-none border-0 bg-transparent px-3 py-2.5 text-sm shadow-none focus-visible:ring-0"
                                />

                                <div className="flex justify-end gap-1.5 px-2.5 pb-2.5">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-8"
                                    onClick={() => {
                                      setReplyTo(null);
                                      setReplyBody("");
                                    }}
                                  >
                                    Cancel
                                  </Button>

                                  <Button
                                    type="submit"
                                    size="sm"
                                    className="h-8"
                                    disabled={
                                      !replyBody.trim() || replySubmitting
                                    }
                                  >
                                    {replySubmitting ? "Posting..." : "Reply"}
                                  </Button>
                                </div>
                              </div>
                            </form>
                          )}

                          {/* Replies */}
                          {replies.length > 0 && (
                            <div className="mt-3 ml-1">
                              {/* Collapse / expand toggle */}
                              <button
                                type="button"
                                onClick={() => toggleThread(comment.id)}
                                className="mb-1 inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                              >
                                {collapsed ? (
                                  <ChevronDown className="size-3.5" />
                                ) : (
                                  <ChevronUp className="size-3.5" />
                                )}
                                {collapsed
                                  ? `Show ${replies.length} ${replies.length === 1 ? "reply" : "replies"}`
                                  : "Hide replies"}
                              </button>

                              {!collapsed && (
                                <div className="flex flex-col">
                                  {replies.map((reply: Comment, index: number) => {
                                    const isLast = index === replies.length - 1;

                                    return (
                                      <div key={reply.id} className="flex gap-1">
                                        {/* Rail: a smooth elbow curve into this reply's
                                            header, plus a straight line continuing down
                                            to the next reply. The column stretches to
                                            match the reply's own height (flex default
                                            align-items: stretch), so it never drifts out
                                            of sync with wrapped/long comment text. */}
                                        <div className="relative w-5 flex-none">
                                          <svg
                                            width="20"
                                            height="16"
                                            viewBox="0 0 20 16"
                                            fill="none"
                                            className="absolute left-0 top-0 text-border"
                                          >
                                            <path
                                              d="M1 0V6C1 10.9706 5.02944 15 10 15H19"
                                              stroke="currentColor"
                                              strokeWidth="1.5"
                                              strokeLinecap="round"
                                            />
                                          </svg>

                                          {!isLast && (
                                            <div className="absolute bottom-0 left-px top-4 w-px bg-border" />
                                          )}
                                        </div>

                                        <div className="min-w-0 flex-1 pb-5">
                                          <CommentItem
                                            comment={reply}
                                            isReply
                                            onSaveEdit={handleSaveEdit}
                                            onDelete={handleDeleteComment}
                                          />
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}
                        </article>
                      );
                    })}
                </div>
              )}
            </div>

          </section>


          </section>

          {/* Playlist */}
          <aside className="min-w-0 lg:sticky lg:top-14 lg:self-start lg:pt-14">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Course
                </p>

                <h2 className="mt-1 text-base font-semibold tracking-tight">
                  Chapters
                </h2>
              </div>

              <span className="text-xs text-muted-foreground">
                {course.chapters.length}
              </span>
            </div>

            <nav className="mt-4 max-h-[calc(100svh-11rem)] overflow-y-auto pr-2">
              {course.chapters.map((item: Chapter, index: number) => {
                const active = item.id === selectedId;

                return (
                  <Link
                    key={item.id}
                    href={`/learn/${course.id}/chapters/${item.id}`}
                    onClick={() => setSelectedId(item.id)}
                    className={[
                      "group relative flex items-center gap-3 py-3 transition-colors",
                      active
                        ? "text-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    ].join(" ")}
                  >
                    {/* Number */}
                    <span
                      className={[
                        "flex size-7 shrink-0 items-center justify-center rounded-full text-xs transition-colors",
                        active
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground group-hover:bg-muted/80",
                      ].join(" ")}
                    >
                      {active ? (
                        <Play className="size-3 fill-current" />
                      ) : (
                        index + 1
                      )}
                    </span>

                    {/* Text */}
                    <span className="min-w-0 flex-1">
                      <span
                        className={[
                          "block truncate text-sm leading-5",
                          active ? "font-semibold" : "font-medium",
                        ].join(" ")}
                      >
                        {item.title}
                      </span>

                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {item.sections.length}{" "}
                        {item.sections.length === 1
                          ? "section"
                          : "sections"}
                      </span>
                    </span>

                    {/* Arrow */}
                    <ChevronRight
                      className={[
                        "size-4 shrink-0 transition-all",
                        active
                          ? "translate-x-0 opacity-100"
                          : "-translate-x-1 opacity-0 group-hover:translate-x-0 group-hover:opacity-60",
                      ].join(" ")}
                    />
                  </Link>
                );
              })}
            </nav>

            {course.chapters.length === 0 && (
              <p className="mt-5 text-sm text-muted-foreground">
                No chapters available.
              </p>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function Avatar({
  name,
  avatarUrl,
  size,
}: {
  name: string;
  avatarUrl: string | null;
  size: "sm" | "md";
}) {
  const initials = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return avatarUrl ? (
    <img
      src={avatarUrl}
      alt=""
      className={size === "sm" ? "size-7 rounded-full object-cover" : "size-9 rounded-full object-cover"}
    />
  ) : (
    <span
      aria-hidden="true"
      className={[
        "inline-flex shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary",
        size === "sm" ? "size-7 text-[10px]" : "size-9 text-xs",
      ].join(" ")}
    >
      {initials || "?"}
    </span>
  );
}

function formatCommentDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}