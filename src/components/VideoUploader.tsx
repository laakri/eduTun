"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as tus from "tus-js-client";
import {
  AlertCircle,
  Check,
  CircleDot,
  FileVideo,
  Loader2,
  Pause,
  Play,
  RotateCcw,
  Upload,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Status =
  | "idle"
  | "starting"
  | "uploading"
  | "paused"
  | "processing"
  | "ready"
  | "error";

type BunnyStatus = {
  ready: boolean;
  failed: boolean;
  status: number;
  encodeProgress: number;
  storageSize: number;
  durationSeconds?: number;
  message?: string | null;
  thumbnailUrl?: string | null;
};

type Props = {
  courseId: string;
  order: number;
  onReady: (
    chapterId: string,
    chapterTitle: string,
    details: {
      durationSeconds: number | null;
      thumbnailUrl: string | null;
    },
  ) => void;
};

const CHUNK_SIZE = 52_428_800;

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 MB";
  }

  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = bytes / 1024 ** index;

  return `${value >= 10 ? value.toFixed(0) : value.toFixed(1)} ${units[index]}`;
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "calculating";
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);

  if (minutes === 0) {
    return `${remainingSeconds}s`;
  }

  return `${minutes}m ${remainingSeconds.toString().padStart(2, "0")}s`;
}

function statusLabel(status: number) {
  switch (status) {
    case 0:
      return "Waiting for upload";
    case 1:
      return "Upload received";
    case 2:
      return "Processing";
    case 3:
      return "Transcoding";
    case 4:
      return "Ready";
    case 5:
    case 6:
      return "Bunny reported a processing error";
    default:
      return "Checking video status";
  }
}

export function VideoUploader({ courseId, order, onReady }: Props) {
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState(0);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [title, setTitle] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedBytes, setUploadedBytes] = useState(0);
  const [totalBytes, setTotalBytes] = useState(0);
  const [uploadSpeed, setUploadSpeed] = useState(0);
  const [chapterId, setChapterId] = useState<string | null>(null);
  const [bunnyStatus, setBunnyStatus] = useState<BunnyStatus | null>(null);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const uploadRef = useRef<tus.Upload | null>(null);
  const lastProgressRef = useRef<{ bytes: number; time: number } | null>(null);

  const canStart = title.trim().length > 0 && selectedFile !== null;
  const etaSeconds = useMemo(() => {
    if (!uploadSpeed || !totalBytes) {
      return 0;
    }

    return (totalBytes - uploadedBytes) / uploadSpeed;
  }, [totalBytes, uploadSpeed, uploadedBytes]);

  const cleanupPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      cleanupPolling();
      void uploadRef.current?.abort();
    };
  }, [cleanupPolling]);

  const pollStatus = useCallback(
    (readyChapterId: string, chapterTitle: string) => {
      cleanupPolling();

      async function checkStatus() {
        try {
          const res = await fetch(`/api/chapters/${readyChapterId}/status`);
          const json = await res.json();

          if (!res.ok || !json.success) {
            throw new Error(json.error?.message ?? "Status check failed");
          }

          const data = json.data as BunnyStatus;
          setBunnyStatus(data);
          setProcessingProgress(data.ready ? 100 : data.encodeProgress ?? 0);

          if (data.failed) {
            cleanupPolling();
            setStatus("error");
            setErrorMessage(
              data.message ??
                "Bunny accepted the upload but could not process this video.",
            );
            return;
          }

          if (data.ready) {
            cleanupPolling();
            setStatus("ready");
            onReady(readyChapterId, chapterTitle, {
              durationSeconds: data.durationSeconds ?? null,
              thumbnailUrl: data.thumbnailUrl ?? null,
            });
          }
        } catch {
          setBunnyStatus((current) => current);
        }
      }

      void checkStatus();
      pollRef.current = setInterval(checkStatus, 3500);
    },
    [cleanupPolling, onReady],
  );

  function selectFile(file: File) {
    if (!file.type.startsWith("video/")) {
      setErrorMessage("Please choose a video file.");
      return;
    }

    setSelectedFile(file);
    setTotalBytes(file.size);
    setUploadedBytes(0);
    setProgress(0);
    setErrorMessage(null);
    setBunnyStatus(null);
  }

  async function startUpload() {
    if (!selectedFile) {
      setErrorMessage("Choose a video file first.");
      return;
    }

    if (!title.trim()) {
      setErrorMessage("Give this lesson a name first.");
      return;
    }

    if (!tus.isSupported) {
      setErrorMessage(
        "This browser does not support resumable uploads. Try a modern browser.",
      );
      setStatus("error");
      return;
    }

    setErrorMessage(null);
    setStatus("starting");
    setProgress(0);
    setProcessingProgress(0);
    setUploadedBytes(0);
    setUploadSpeed(0);
    lastProgressRef.current = null;

    try {
      const chapterTitle = title.trim();

      const initRes = await fetch("/api/chapters", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          courseId,
          title: chapterTitle,
          order,
        }),
      });

      const initJson = await initRes.json();

      if (!initRes.ok || !initJson.success) {
        setStatus("error");
        setErrorMessage(
          initJson.error?.message ??
            "Something went wrong starting the upload. Please try again.",
        );
        return;
      }

      const {
        chapterId: nextChapterId,
        videoId,
        uploadCredentials,
      } = initJson.data;
      setChapterId(nextChapterId);
      setStatus("uploading");

      const upload = new tus.Upload(selectedFile, {
        endpoint: uploadCredentials.endpoint,
        chunkSize: CHUNK_SIZE,
        retryDelays: [0, 3000, 5000, 10000, 20000],
        removeFingerprintOnSuccess: true,
        fingerprint(file, options) {
          const name =
            file instanceof File ? `${file.name}-${file.size}` : "video";
          return Promise.resolve(
            `${options.endpoint}-${courseId}-${nextChapterId}-${videoId}-${name}`,
          );
        },
        headers: {
          AuthorizationSignature: uploadCredentials.authorizationSignature,
          AuthorizationExpire: String(uploadCredentials.authorizationExpire),
          VideoId: videoId,
          LibraryId: uploadCredentials.libraryId,
        },
        metadata: {
          filename: selectedFile.name,
          filetype: selectedFile.type || "video/mp4",
          title: chapterTitle,
        },
        onProgress(bytesUploaded, bytesTotal) {
          const now = Date.now();
          const previous = lastProgressRef.current;

          if (previous) {
            const elapsedSeconds = (now - previous.time) / 1000;
            const bytesDelta = bytesUploaded - previous.bytes;

            if (elapsedSeconds > 0 && bytesDelta >= 0) {
              setUploadSpeed(bytesDelta / elapsedSeconds);
            }
          }

          lastProgressRef.current = { bytes: bytesUploaded, time: now };
          setUploadedBytes(bytesUploaded);
          setTotalBytes(bytesTotal);
          setProgress(Math.round((bytesUploaded / bytesTotal) * 100));
        },
        onSuccess() {
          setProgress(100);
          setUploadedBytes(selectedFile.size);
          setStatus("processing");
          pollStatus(nextChapterId, chapterTitle);
        },
        onError(error) {
          setStatus("error");
          setErrorMessage(
            error.message ||
              "The upload did not go through. Check your connection and try again.",
          );
        },
      });

      uploadRef.current = upload;

      const previousUploads = await upload.findPreviousUploads();

      const previousUpload = previousUploads[0];

      if (previousUpload) {
        upload.resumeFromPreviousUpload(previousUpload);
      }

      upload.start();
    } catch {
      setStatus("error");
      setErrorMessage(
        "Something went wrong with the upload. Please try again.",
      );
    }
  }

  async function pauseUpload() {
    await uploadRef.current?.abort();
    setStatus("paused");
  }

  function resumeUpload() {
    uploadRef.current?.start();
    setStatus("uploading");
  }

  function reset() {
    cleanupPolling();
    void uploadRef.current?.abort(true);
    uploadRef.current = null;
    lastProgressRef.current = null;

    setStatus("idle");
    setProgress(0);
    setProcessingProgress(0);
    setUploadedBytes(0);
    setUploadSpeed(0);
    setChapterId(null);
    setBunnyStatus(null);
    setErrorMessage(null);
    setSelectedFile(null);

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);

    const file = event.dataTransfer.files?.[0];

    if (file) {
      selectFile(file);
    }
  }

  const uploadActive = status === "starting" || status === "uploading";
  const uploadStarted =
    status === "uploading" ||
    status === "paused" ||
    status === "processing" ||
    status === "ready";

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="space-y-4">
          <div>
            <label
              htmlFor={`chapter-title-${order}`}
              className="text-sm font-medium"
            >
              Lesson name
            </label>

            <Input
              id={`chapter-title-${order}`}
              value={title}
              disabled={uploadStarted}
              onChange={(event) => {
                setTitle(event.target.value);
                setErrorMessage(null);
              }}
              placeholder="e.g. Chapter 1 - Introduction"
              className="mt-2 h-11"
            />
          </div>

          <div
            role="button"
            tabIndex={0}
            onClick={() => !uploadStarted && inputRef.current?.click()}
            onKeyDown={(event) => {
              if (
                !uploadStarted &&
                (event.key === "Enter" || event.key === " ")
              ) {
                event.preventDefault();
                inputRef.current?.click();
              }
            }}
            onDragEnter={(event) => {
              event.preventDefault();
              if (!uploadStarted) {
                setDragging(true);
              }
            }}
            onDragOver={(event) => {
              event.preventDefault();
              if (!uploadStarted) {
                setDragging(true);
              }
            }}
            onDragLeave={(event) => {
              event.preventDefault();
              setDragging(false);
            }}
            onDrop={uploadStarted ? undefined : handleDrop}
            className={cn(
              "cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-all",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              uploadStarted && "cursor-default border-border bg-muted/20",
              dragging
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/20 hover:border-primary/40 hover:bg-muted/30",
            )}
          >
            <input
              ref={inputRef}
              type="file"
              accept="video/*"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];

                if (file) {
                  selectFile(file);
                }
              }}
            />

            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FileVideo className="h-6 w-6" />
            </div>

            <p className="mt-4 font-medium">
              {selectedFile
                ? selectedFile.name
                : dragging
                  ? "Drop your video here"
                  : "Drag and drop your video here"}
            </p>

            <p className="mt-1 text-sm text-muted-foreground">
              {selectedFile
                ? `${formatBytes(selectedFile.size)} selected`
                : "or click to choose a video from your computer"}
            </p>
          </div>
        </div>

        <div className="rounded-lg border bg-background p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Upload queue</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Lesson {order + 1}
              </p>
            </div>

            <span
              className={cn(
                "inline-flex h-6 items-center rounded-full px-2 text-xs font-medium",
                status === "ready" && "bg-emerald-500/10 text-emerald-700",
                status === "error" && "bg-destructive/10 text-destructive",
                status !== "ready" &&
                  status !== "error" &&
                  "bg-muted text-muted-foreground",
              )}
            >
              {status === "idle" && "Draft"}
              {status === "starting" && "Starting"}
              {status === "uploading" && "Uploading"}
              {status === "paused" && "Paused"}
              {status === "processing" && "Processing"}
              {status === "ready" && "Ready"}
              {status === "error" && "Needs attention"}
            </span>
          </div>

          <div className="mt-5 space-y-4">
            <ProgressStep
              active={status === "starting" || status === "uploading"}
              complete={
                progress === 100 || status === "processing" || status === "ready"
              }
              label="Upload"
              value={progress}
            />
            <ProgressStep
              active={status === "processing"}
              complete={status === "ready"}
              label="Processing"
              value={processingProgress}
            />
          </div>

          {selectedFile && (
            <div className="mt-5 rounded-lg bg-muted/30 p-3 text-xs text-muted-foreground">
              <div className="flex justify-between gap-4">
                <span>{formatBytes(uploadedBytes)}</span>
                <span>{formatBytes(totalBytes)}</span>
              </div>
              <div className="mt-2 flex justify-between gap-4">
                <span>{formatBytes(uploadSpeed)}/s</span>
                <span>{formatTime(etaSeconds)}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {bunnyStatus && status === "processing" && (
        <div className="rounded-lg border bg-muted/20 p-4">
          <div className="flex items-start gap-3">
            <Loader2 className="mt-0.5 h-4 w-4 animate-spin text-primary" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">
                {statusLabel(bunnyStatus.status)}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Bunny has the file. Encoding is {processingProgress}% complete.
              </p>
            </div>
          </div>
        </div>
      )}

      {status === "ready" && (
        <div className="flex items-center gap-4 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
            <Check className="h-5 w-5" />
          </div>

          <div>
            <p className="font-medium">Your video is ready</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Students will be able to watch this lesson once the course is
              published.
            </p>
          </div>
        </div>
      )}

      {status === "error" && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />

            <div className="flex-1">
              <p className="font-medium">We could not upload this video</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {errorMessage}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Uploads are resumable. Keep this tab open until processing begins.
        </p>

        <div className="flex flex-wrap items-center gap-2">
          {status === "idle" && (
            <Button type="button" onClick={startUpload} disabled={!canStart}>
              <Upload className="h-4 w-4" />
              Start upload
            </Button>
          )}

          {uploadActive && (
            <Button type="button" variant="outline" onClick={pauseUpload}>
              <Pause className="h-4 w-4" />
              Pause
            </Button>
          )}

          {status === "paused" && (
            <Button type="button" onClick={resumeUpload}>
              <Play className="h-4 w-4" />
              Resume
            </Button>
          )}

          {(status === "paused" || status === "error") && (
            <Button type="button" variant="outline" onClick={reset}>
              <RotateCcw className="h-4 w-4" />
              Start over
            </Button>
          )}

          {status !== "idle" && status !== "ready" && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={reset}
              aria-label="Cancel upload"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {errorMessage && status !== "error" && (
        <p className="text-sm text-destructive">{errorMessage}</p>
      )}

      {chapterId && (
        <p className="sr-only">Current chapter upload id: {chapterId}</p>
      )}
    </div>
  );
}

function ProgressStep({
  active,
  complete,
  label,
  value,
}: {
  active: boolean;
  complete: boolean;
  label: string;
  value: number;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "flex h-6 w-6 items-center justify-center rounded-full border text-muted-foreground",
              active && "border-primary text-primary",
              complete && "border-emerald-500 bg-emerald-500 text-white",
            )}
          >
            {complete ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <CircleDot className="h-3.5 w-3.5" />
            )}
          </span>
          <span className="text-sm font-medium">{label}</span>
        </div>

        <span className="text-xs font-semibold tabular-nums text-muted-foreground">
          {Math.max(0, Math.min(100, Math.round(value)))}%
        </span>
      </div>

      <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-300",
            complete ? "bg-emerald-500" : "bg-primary",
          )}
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  );
}
