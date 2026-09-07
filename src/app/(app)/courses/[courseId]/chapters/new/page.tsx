"use client";


import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  Paperclip,
  Play,
  Plus,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  VideoPlayer,
  formatTime,
  parseTimecode,
  type VideoChapter,
  type VideoPlayerHandle,
} from "@/components/video-player";

type UploadCredentials = {
  endpoint: string;
  libraryId: string;
  videoId: string;
  authorizationSignature: string;
  authorizationExpire: number;
};

type CreateChapterResult = {
  chapterId: string;
  videoId: string;
  uploadCredentials: UploadCredentials;
};

type BunnyStatus = {
  ready: boolean;
  failed: boolean;
  notUploaded: boolean;
  status: number;
  encodeProgress: number;
  durationSeconds?: number;
  message: string | null;
  thumbnailUrl: string | null;
};

type Phase = "idle" | "creating" | "uploading" | "processing" | "ready" | "error";

type SectionDraft = {
  id: string;
  title: string;
  start: string; // "m:ss", kept as text so it's easy to type or autofill
  end: string;
};

type ResourceDraft = {
  id: string;
  file: File;
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

let localIdCounter = 0;
function localId() {
  localIdCounter += 1;
  return `local-${localIdCounter}`;
}

export default function NewChapterPage() {
  const router = useRouter();
  const params = useParams<{ courseId: string }>();
  const courseId = params.courseId;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [order, setOrder] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const [phase, setPhase] = useState<Phase>("idle");
  const [uploadPct, setUploadPct] = useState(0);
  const [encodeProgress, setEncodeProgress] = useState(0);
  const [uploadConfirmedAt, setUploadConfirmedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [chapterId, setChapterId] = useState<string | null>(null);

  const [sections, setSections] = useState<SectionDraft[]>([]);
  const [resources, setResources] = useState<ResourceDraft[]>([]);
  const [resourceError, setResourceError] = useState<string | null>(null);

  const [duration, setDuration] = useState(0);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);

  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playerRef = useRef<VideoPlayerHandle>(null);
  const previewWrapperRef = useRef<HTMLDivElement | null>(null);

  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => {
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const busy = phase === "creating" || phase === "uploading";
  const locked = busy || phase === "processing" || phase === "ready";

  // Sections annotated with parsed seconds, sorted by start time — this is
  // the single source of truth for both the editor list below and the
  // chapter markers shown on the player.
  const orderedSections = useMemo(() => {
    return sections
      .map((s) => ({ ...s, startSec: parseTimecode(s.start), endSec: parseTimecode(s.end) }))
      .sort((a, b) => (a.startSec ?? Infinity) - (b.startSec ?? Infinity));
  }, [sections]);

  const chaptersForPlayer = useMemo<VideoChapter[]>(
    () =>
      orderedSections
        .filter((s): s is typeof s & { startSec: number } => s.startSec !== null)
        .map((s) => ({ id: s.id, title: s.title.trim() || "Untitled", start: s.startSec })),
    [orderedSections],
  );

  // Matches BunnyChapterPayload from lib/bunny.ts — this is what you'd pass
  // to syncBunnyVideoChapters(videoId, sectionsPayload) once you wire it
  // up. Built here so it's ready to go, but intentionally never sent.
  const sectionsPayload = useMemo(
    () =>
      orderedSections
        .filter(
          (s): s is typeof s & { startSec: number; endSec: number } =>
            s.startSec !== null && s.endSec !== null && s.endSec > s.startSec,
        )
        .map((s, index) => ({
          title: s.title.trim(),
          start: s.startSec,
          end: s.endSec,
          order: index,
        })),
    [orderedSections],
  );

  // Poll Bunny's real transcoding status once the upload has finished.
  useEffect(() => {
    if (phase !== "processing" || !chapterId) return;

    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch(`/api/chapters/${chapterId}/status`);
        const json = await res.json().catch(() => null);
        if (!res.ok) throw new Error(json?.message ?? "Status check failed.");

        const status: BunnyStatus = json?.data ?? json;
        if (cancelled) return;

        setEncodeProgress(status.encodeProgress ?? 0);

        if (status.failed) {
          setPhase("error");
          setError(status.message ?? "Bunny failed to process this video.");
          return;
        }

        // Bunny can briefly report status 0 while it finalizes a successful
        // TUS upload. Wait for that handoff, but never show an endless fake
        // transcoding state if no bytes arrive.
        if (status.notUploaded) {
          if (uploadConfirmedAt && Date.now() - uploadConfirmedAt > 5 * 60_000) {
            setPhase("error");
            setError("Bunny did not finalize this upload after five minutes. Please retry the video upload.");
            return;
          }
          pollRef.current = setTimeout(poll, 3000);
          return;
        }

        if (status.ready) {
          setPhase("ready");
          return;
        }

        pollRef.current = setTimeout(poll, 3000);
      } catch (err) {
        if (cancelled) return;
        setPhase("error");
        setError(err instanceof Error ? err.message : "Status check failed.");
      }
    }

    poll();

    return () => {
      cancelled = true;
      if (pollRef.current) clearTimeout(pollRef.current);
    };
  }, [phase, chapterId, uploadConfirmedAt]);

  function pickFile(selected: File | null | undefined) {
    if (!selected) return;
    if (!selected.type.startsWith("video/")) {
      setError("That doesn't look like a video file.");
      return;
    }
    setError(null);
    setDuration(0);
    setFile(selected);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragActive(false);
    if (locked) return;
    pickFile(e.dataTransfer.files?.[0]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Give the chapter a title.");
      return;
    }
    if (!file) {
      setError("Choose a video before creating the chapter.");
      return;
    }

    setPhase("creating");
    try {
      const res = await fetch("/api/chapters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId,
          title: title.trim(),
          description: description.trim() || undefined,
          order,
        }),
      });
      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.error?.message ?? json?.message ?? "Couldn't create the chapter.");
      }

      const result: CreateChapterResult = json?.data ?? json;
      setChapterId(result.chapterId);
      startUpload(file, result.chapterId);
    } catch (err) {
      setPhase("error");
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  function startUpload(selected: File, createdChapterId: string) {
    setPhase("uploading");
    setUploadPct(0);
    void (async () => {
      try {
        const videoForm = new FormData();
        videoForm.set("file", selected);
        const videoResponse = await fetch(`/api/chapters/${createdChapterId}/video`, { method: "POST", body: videoForm });
        if (!videoResponse.ok) { const json = await videoResponse.json().catch(() => null); throw new Error(json?.error?.message ?? "Bunny video upload failed."); }
        setUploadPct(100);
        setUploadConfirmedAt(Date.now());
          if (sectionsPayload.length > 0) {
            const sectionResponse = await fetch(`/api/chapters/${createdChapterId}/sections`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ sections: sectionsPayload.map(({ title, start, end, order }) => ({ title, startSeconds: start, endSeconds: end, order })) }),
            });
            if (!sectionResponse.ok) throw new Error("Video uploaded, but timestamps could not be saved.");
          }
          for (const resource of resources) {
            const resourceForm = new FormData();
            resourceForm.set("file", resource.file);
            const resourceResponse = await fetch(`/api/chapters/${createdChapterId}/resources`, { method: "POST", body: resourceForm });
            if (!resourceResponse.ok) throw new Error("Video uploaded, but a PDF could not be uploaded.");
          }
          setPhase("processing");
      } catch (err) {
        setPhase("error");
        setError(err instanceof Error ? err.message : "Chapter setup could not be completed.");
      }
    })();
  }

  // ---- Timestamps (VideoSection) ----

  // "Smart" add: snaps the previous timestamp's end to right now, and this
  // new one's end to wherever the next timestamp already starts (or +30s /
  // the end of the video if there isn't one) — so chapters stay contiguous
  // without the user fiddling with every boundary by hand.
  function addSection() {
    const current = playerRef.current?.getCurrentTime() ?? 0;
    const currentLabel = formatTime(current);

    setSections((prev) => {
      const parsed = prev
        .map((s) => ({ ...s, startSec: parseTimecode(s.start) }))
        .sort((a, b) => (a.startSec ?? Infinity) - (b.startSec ?? Infinity));

      const previous = [...parsed].reverse().find((s) => (s.startSec ?? Infinity) < current);
      const next = parsed.find((s) => (s.startSec ?? -Infinity) > current);

      const withClosedGap = previous
        ? prev.map((s) => (s.id === previous.id ? { ...s, end: currentLabel } : s))
        : prev;

      const fallbackEnd = formatTime(Math.min(current + 30, duration || current + 30));
      const end = next ? next.start : fallbackEnd;

      return [...withClosedGap, { id: localId(), title: "", start: currentLabel, end }];
    });
  }

  function updateSection(id: string, patch: Partial<SectionDraft>) {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  function removeSection(id: string) {
    setSections((prev) => prev.filter((s) => s.id !== id));
  }

  function setTimestampFromPlayer(id: string, field: "start" | "end") {
    const current = playerRef.current?.getCurrentTime() ?? 0;
    updateSection(id, { [field]: formatTime(current) });
  }

  function jumpTo(seconds: number) {
    playerRef.current?.seekTo(seconds);
    playerRef.current?.play();
    previewWrapperRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  // ---- Attach files (ChapterResource) ----

  function addResources(fileList: FileList | null) {
    if (!fileList) return;
    const picked = Array.from(fileList);
    const invalid = picked.some((f) => f.type !== "application/pdf");
    if (invalid) {
      setResourceError("Only PDF files can be attached right now.");
      return;
    }
    setResourceError(null);
    setResources((prev) => [...prev, ...picked.map((f) => ({ id: localId(), file: f }))]);
  }

  function removeResource(id: string) {
    setResources((prev) => prev.filter((r) => r.id !== id));
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">New chapter</p>
          <h1 className="text-2xl font-semibold tracking-tight">Add a chapter</h1>
        </div>
        <Button variant="ghost" onClick={() => router.push(`/courses/${courseId}`)}>
          Cancel
        </Button>
      </div>
      <p className="mb-8 text-sm text-muted-foreground">
        Add your video first. Timestamps and files below are optional — add them now or come
        back later.
      </p>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        {/* Video — the hero of the page */}
        <div className="space-y-3">
          {!file ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                if (!locked) setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              className={[
                "relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-xl border bg-muted/30 transition-colors",
                dragActive ? "border-primary bg-primary/5" : "border-border",
              ].join(" ")}
            >
              <label className="flex cursor-pointer flex-col items-center gap-3 px-6 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-background shadow-sm">
                  <UploadCloud className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">Drag a video here, or click to browse</p>
                  <p className="mt-1 text-xs text-muted-foreground">MP4, MOV, or MKV</p>
                </div>
                <input
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={(e) => pickFile(e.target.files?.[0])}
                />
              </label>
            </div>
          ) : (
            <div ref={previewWrapperRef} className="relative">
              <VideoPlayer
                ref={playerRef}
                src={previewUrl!}
                title={title.trim() || "Untitled chapter"}
                chapters={chaptersForPlayer}
                onDurationChange={setDuration}
                onChapterChange={(c) => setActiveSectionId(c?.id ?? null)}
              />

              {phase === "idle" && (
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/70 text-white shadow-sm hover:bg-black/90"
                  aria-label="Remove video"
                >
                  <X className="h-4 w-4" />
                </button>
              )}

              {/* Upload / processing status — a compact badge so it doesn't
                  fight with the player's own controls. */}
              {(phase === "creating" || phase === "uploading") && (
                <Badge className="absolute right-3 top-3 z-10 gap-1.5" variant="secondary">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {phase === "creating" ? "Creating chapter…" : `Uploading… ${uploadPct}%`}
                </Badge>
              )}
              {phase === "processing" && (
                <Badge className="absolute right-3 top-3 z-10 gap-1.5" variant="secondary">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Processing… {encodeProgress}%
                </Badge>
              )}
              {phase === "ready" && (
                <Badge className="absolute right-3 top-3 z-10 gap-1.5" variant="secondary">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Ready to watch
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Chapter details */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-base">Chapter details</CardTitle>
            <CardDescription>This appears in the course outline students see.</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="e.g. Limits and continuity"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={locked}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="What will students learn in this chapter?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={locked}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Shown under the title in the course outline. Optional.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="order">Position in course</Label>
              <Input
                id="order"
                type="number"
                min={0}
                className="w-24"
                value={order}
                onChange={(e) => setOrder(Number(e.target.value))}
                disabled={locked}
              />
            </div>

            {error && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}
          </CardContent>

          <Separator />

          <CardFooter className="flex-col items-stretch gap-2 border-none pt-0">
            {phase === "processing" && (
              <p className="text-center text-xs text-muted-foreground">
                {encodeProgress === 0
                  ? "Bunny is finalizing the upload before transcoding begins."
                  : `Transcoding ${encodeProgress}% — this can take a few minutes depending on video length.`}
              </p>
            )}

            {phase === "ready" ? (
              <Button type="button" onClick={() => router.push(`/courses/${courseId}`)}>
                Back to course
              </Button>
            ) : (
              <Button type="submit" disabled={locked}>
                {phase === "creating" && "Creating chapter…"}
                {phase === "uploading" && `Uploading… ${uploadPct}%`}
                {phase === "processing" && "Processing…"}
                {(phase === "idle" || phase === "error") && "Create chapter"}
              </Button>
            )}
          </CardFooter>
        </Card>
      </form>

      {/* Timestamps — optional, help students jump to key moments */}
      <Card className="mt-6">
        <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
          <div className="flex gap-3">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
              <Clock className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <CardTitle className="text-base">
                Timestamps{" "}
                <span className="font-normal text-muted-foreground">(optional)</span>
              </CardTitle>
              <CardDescription>
                Mark key moments so students can jump straight to them — like
                &ldquo;Introduction&rdquo; or &ldquo;Worked example&rdquo;. They stay sorted by
                start time automatically.
                {duration > 0 && ` Video length: ${formatTime(duration)}.`}
              </CardDescription>
            </div>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addSection} disabled={!file}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add timestamp
          </Button>
        </CardHeader>

        {orderedSections.length > 0 && (
          <CardContent className="space-y-3">
            {orderedSections.map((section, index) => {
              const { startSec, endSec } = section;
              const invalidRange = startSec !== null && endSec !== null && endSec <= startSec;
              const beyondLength =
                duration > 0 &&
                ((startSec !== null && startSec > duration) ||
                  (endSec !== null && endSec > duration));
              const previous = orderedSections[index - 1];
              const overlapsPrevious =
                previous?.endSec != null && startSec !== null && startSec < previous.endSec;
              const isActive = section.id === activeSectionId;

              return (
                <div
                  key={section.id}
                  className={[
                    "rounded-lg border p-3 transition-colors sm:p-4",
                    isActive ? "border-primary bg-primary/5" : "border-border",
                  ].join(" ")}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    <div className="flex-1 space-y-1.5">
                      <Label htmlFor={`section-title-${section.id}`}>What happens here</Label>
                      <Input
                        id={`section-title-${section.id}`}
                        placeholder="e.g. Introduction"
                        value={section.title}
                        onChange={(e) => updateSection(section.id, { title: e.target.value })}
                      />
                    </div>

                    <div className="flex gap-2">
                      <div className="space-y-1.5">
                        <Label htmlFor={`section-start-${section.id}`}>Starts at</Label>
                        <div className="flex gap-1.5">
                          <Input
                            id={`section-start-${section.id}`}
                            className="w-20"
                            placeholder="0:00"
                            value={section.start}
                            onChange={(e) =>
                              updateSection(section.id, { start: e.target.value })
                            }
                          />
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            title="Use where the video is currently paused"
                            onClick={() => setTimestampFromPlayer(section.id, "start")}
                          >
                            Use current
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor={`section-end-${section.id}`}>Ends at</Label>
                        <div className="flex gap-1.5">
                          <Input
                            id={`section-end-${section.id}`}
                            className="w-20"
                            placeholder="0:30"
                            value={section.end}
                            onChange={(e) => updateSection(section.id, { end: e.target.value })}
                          />
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            title="Use where the video is currently paused"
                            onClick={() => setTimestampFromPlayer(section.id, "end")}
                          >
                            Use current
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-1 sm:ml-auto">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Jump to this moment in the video"
                        title="Jump to this moment in the video"
                        disabled={startSec === null}
                        onClick={() => startSec !== null && jumpTo(startSec)}
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Remove timestamp"
                        onClick={() => removeSection(section.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>

                  {invalidRange && (
                    <p className="mt-2 text-xs text-destructive">
                      The end time should be after the start time.
                    </p>
                  )}
                  {!invalidRange && overlapsPrevious && (
                    <p className="mt-2 text-xs text-destructive">
                      This starts before the previous timestamp ends.
                    </p>
                  )}
                  {!invalidRange && beyondLength && (
                    <p className="mt-2 text-xs text-destructive">
                      This is beyond the video&apos;s length ({formatTime(duration)}).
                    </p>
                  )}
                </div>
              );
            })}
          </CardContent>
        )}

        {orderedSections.length === 0 && (
          <CardContent>
            <p className="text-sm text-muted-foreground">
              No timestamps yet. Tip: play the video above, pause where a new topic starts, then
              click &ldquo;Add timestamp&rdquo; — it picks up the paused time and closes the gap
              with the previous one automatically.
            </p>
          </CardContent>
        )}
      </Card>

      {/* Attach files — optional, e.g. slides or a worksheet */}
      <Card className="mt-6">
        <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
          <div className="flex gap-3">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
              <Paperclip className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <CardTitle className="text-base">
                Attach files{" "}
                <span className="font-normal text-muted-foreground">(optional)</span>
              </CardTitle>
              <CardDescription>
                Add slides, a worksheet, or notes as a PDF students can download.
              </CardDescription>
            </div>
          </div>
          <Button type="button" variant="outline" size="sm" >
              <Plus className="mr-1.5 h-4 w-4" />
              Add PDF
              <input
                type="file"
                accept="application/pdf"
                multiple
                className="hidden"
                onChange={(e) => {
                  addResources(e.target.files);
                  e.target.value = "";
                }}
              />
          </Button>
        </CardHeader>

        <CardContent className="space-y-3">
          {resourceError && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {resourceError}
            </p>
          )}

          {resources.length === 0 ? (
            <p className="text-sm text-muted-foreground">No files attached yet.</p>
          ) : (
            <ul className="space-y-2">
              {resources.map((resource) => (
                <li key={resource.id} className="flex items-center gap-3 rounded-lg border p-3">
                  <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{resource.file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatBytes(resource.file.size)}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove ${resource.file.name}`}
                    onClick={() => removeResource(resource.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
