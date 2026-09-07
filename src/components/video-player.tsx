"use client";

// Reusable custom video player.
//
// Requires:
//   - Tailwind CSS
//   - lucide-react              (npm install lucide-react)
//   - "@/lib/utils" exporting `cn` (the usual shadcn/ui helper — clsx + tailwind-merge)
//
// Optional HLS (.m3u8) support:
//   This component does NOT depend on hls.js — it never imports it, so
//   there's nothing to install and no "Cannot find module" errors. If you
//   need HLS playback in a browser without native support (Safari plays
//   HLS natively; Chrome/Firefox don't), install hls.js yourself and pass
//   the constructor in:
//
//     import Hls from "hls.js";
//     <VideoPlayer src={hlsUrl} hlsConstructor={Hls} />
//
//   Without `hlsConstructor`, an .m3u8 src just falls back to whatever the
//   browser natively supports.
//
// Usage:
//   <VideoPlayer
//     src={video.playbackUrl}
//     poster={video.thumbnailUrl}
//     title={chapter.title}
//     chapters={chapter.sections.map((s) => ({
//       id: s.id,
//       title: s.title,
//       start: s.startSeconds,
//     }))}
//     onChapterChange={(c) => console.log("now watching:", c?.title)}
//   />
//
// Need to drive playback from outside (jump to a timestamp, read the
// current time for an editor, etc.)? Pass a ref — see VideoPlayerHandle.

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  ChevronRight,
  ListVideo,
  Loader2,
  Maximize,
  Minimize,
  Pause,
  PictureInPicture2,
  Play,
  SkipBack,
  SkipForward,
  Settings,
  Volume1,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface VideoChapter {
  id: string;
  title: string;
  /** Start time, in seconds. */
  start: number;
}

/** Minimal shape of an hls.js instance — enough to load a source and clean up. */
interface HlsLikeInstance {
  loadSource: (src: string) => void;
  attachMedia: (video: HTMLVideoElement) => void;
  destroy: () => void;
}

/** Minimal shape of the hls.js class itself (the default export). */
export interface HlsLikeConstructor {
  isSupported: () => boolean;
  new (): HlsLikeInstance;
}

export interface VideoPlayerHandle {
  play: () => void;
  pause: () => void;
  seekTo: (seconds: number) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
}

export interface VideoPlayerProps {
  src: string;
  poster?: string;
  title?: string;
  chapters?: VideoChapter[];
  autoPlay?: boolean;
  className?: string;
  /** See the "Optional HLS support" note at the top of this file. */
  hlsConstructor?: HlsLikeConstructor;
  /** Fires whenever playback crosses into a new chapter. */
  onChapterChange?: (chapter: VideoChapter | null) => void;
  onTimeUpdate?: (seconds: number) => void;
  onDurationChange?: (seconds: number) => void;
  onEnded?: () => void;
}

const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] as const;
const SKIP_SECONDS = 10;
const CONTROLS_HIDE_DELAY = 2800;

export function formatTime(totalSeconds: number) {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return "0:00";
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** Parses a "m:ss" or "h:mm:ss" (or bare seconds) string into seconds, or null if invalid. */
export function parseTimecode(value: string): number | null {
  const trimmed = value.trim();
  if (/^\d+$/.test(trimmed)) return Number(trimmed);
  const parts = trimmed.split(":");
  if (parts.length < 2 || parts.length > 3 || parts.some((p) => !/^\d{1,2}$/.test(p))) {
    return null;
  }
  const nums = parts.map(Number);
  if (nums.some((n) => Number.isNaN(n))) return null;

  const [a, b, c] = nums;

  if (nums.length === 3 && a !== undefined && b !== undefined && c !== undefined) {
    return a * 3600 + b * 60 + c;
  }

  if (nums.length === 2 && a !== undefined && b !== undefined) {
    return a * 60 + b;
  }

  return null;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export const VideoPlayer = forwardRef<VideoPlayerHandle, VideoPlayerProps>(
  function VideoPlayer(
    {
      src,
      poster,
      title,
      chapters,
      autoPlay = false,
      className,
      hlsConstructor,
      onChapterChange,
      onTimeUpdate,
      onDurationChange,
      onEnded,
    },
    ref,
  ) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const scrubTrackRef = useRef<HTMLDivElement>(null);
    const volumeTrackRef = useRef<HTMLDivElement>(null);
    const hideControlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const speedMenuRef = useRef<HTMLDivElement>(null);

    const [isPlaying, setIsPlaying] = useState(false);
    const [isBuffering, setIsBuffering] = useState(false);
    const [hasStarted, setHasStarted] = useState(false);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [bufferedEnd, setBufferedEnd] = useState(0);
    const [volume, setVolume] = useState(1);
    const [muted, setMuted] = useState(false);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isPipActive, setIsPipActive] = useState(false);
    const [pipSupported, setPipSupported] = useState(false);
    const [controlsVisible, setControlsVisible] = useState(true);
    const [speedMenuOpen, setSpeedMenuOpen] = useState(false);
    const [chapterListOpen, setChapterListOpen] = useState(false);
    const [scrubbing, setScrubbing] = useState(false);
    const [scrubPreview, setScrubPreview] = useState<{ ratio: number; time: number } | null>(
      null,
    );
    const [error, setError] = useState<string | null>(null);

    const sortedChapters = useMemo(
      () => [...(chapters ?? [])].sort((a, b) => a.start - b.start),
      [chapters],
    );

    const activeChapter = useMemo<VideoChapter | null>(() => {
      if (sortedChapters.length === 0) return null;
      let current: VideoChapter | null = null;
      for (const chapter of sortedChapters) {
        if (chapter.start <= currentTime) current = chapter;
        else break;
      }
      return current ?? sortedChapters[0] ?? null;
    }, [sortedChapters, currentTime]);

    const lastReportedChapterId = useRef<string | null>(null);
    useEffect(() => {
      const id = activeChapter?.id ?? null;
      if (id !== lastReportedChapterId.current) {
        lastReportedChapterId.current = id;
        onChapterChange?.(activeChapter);
      }
    }, [activeChapter, onChapterChange]);

    // ---- Imperative controls for parent components ----
    useImperativeHandle(
      ref,
      () => ({
        play: () => void videoRef.current?.play(),
        pause: () => videoRef.current?.pause(),
        seekTo: (seconds: number) => {
          const video = videoRef.current;
          if (!video) return;
          video.currentTime = clamp(seconds, 0, video.duration || Infinity);
        },
        getCurrentTime: () => videoRef.current?.currentTime ?? 0,
        getDuration: () => videoRef.current?.duration ?? 0,
      }),
      [],
    );

    // ---- Load source (native by default, hls.js only if the caller provides it) ----
    useEffect(() => {
      const video = videoRef.current;
      if (!video) return;

      setError(null);
      setHasStarted(false);

      const isHls = src.includes(".m3u8");
      const canPlayNativeHls = video.canPlayType("application/vnd.apple.mpegurl") !== "";

      if (isHls && !canPlayNativeHls && hlsConstructor?.isSupported()) {
        const hls = new hlsConstructor();
        hls.loadSource(src);
        hls.attachMedia(video);
        return () => hls.destroy();
      }

      video.src = src;
      return undefined;
    }, [src, hlsConstructor]);

    // ---- Core <video> event wiring ----
    useEffect(() => {
      const video = videoRef.current;
      if (!video) return;

      const onLoadedMetadata = () => {
        setDuration(video.duration || 0);
        onDurationChange?.(video.duration || 0);
      };
      const onTimeUpdateEvent = () => {
        setCurrentTime(video.currentTime);
        onTimeUpdate?.(video.currentTime);
      };
      const onProgress = () => {
        const ranges = video.buffered;
        if (ranges.length > 0) setBufferedEnd(ranges.end(ranges.length - 1));
      };
      const onPlay = () => {
        setIsPlaying(true);
        setHasStarted(true);
      };
      const onPause = () => setIsPlaying(false);
      const onWaiting = () => setIsBuffering(true);
      const onPlaying = () => setIsBuffering(false);
      const onVolumeChange = () => {
        setVolume(video.volume);
        setMuted(video.muted);
      };
      const onRateChange = () => setPlaybackRate(video.playbackRate);
      const onEndedEvent = () => {
        setIsPlaying(false);
        onEnded?.();
      };
      const onErrorEvent = () => setError("This video couldn't be loaded.");

      video.addEventListener("loadedmetadata", onLoadedMetadata);
      video.addEventListener("timeupdate", onTimeUpdateEvent);
      video.addEventListener("progress", onProgress);
      video.addEventListener("play", onPlay);
      video.addEventListener("pause", onPause);
      video.addEventListener("waiting", onWaiting);
      video.addEventListener("playing", onPlaying);
      video.addEventListener("volumechange", onVolumeChange);
      video.addEventListener("ratechange", onRateChange);
      video.addEventListener("ended", onEndedEvent);
      video.addEventListener("error", onErrorEvent);

      return () => {
        video.removeEventListener("loadedmetadata", onLoadedMetadata);
        video.removeEventListener("timeupdate", onTimeUpdateEvent);
        video.removeEventListener("progress", onProgress);
        video.removeEventListener("play", onPlay);
        video.removeEventListener("pause", onPause);
        video.removeEventListener("waiting", onWaiting);
        video.removeEventListener("playing", onPlaying);
        video.removeEventListener("volumechange", onVolumeChange);
        video.removeEventListener("ratechange", onRateChange);
        video.removeEventListener("ended", onEndedEvent);
        video.removeEventListener("error", onErrorEvent);
      };
    }, [onDurationChange, onEnded, onTimeUpdate]);

    // ---- Fullscreen + Picture-in-Picture support detection ----
    useEffect(() => {
      setPipSupported(
        typeof document !== "undefined" &&
          "pictureInPictureEnabled" in document &&
          !videoRef.current?.disablePictureInPicture,
      );

      const onFullscreenChange = () => {
        setIsFullscreen(document.fullscreenElement === containerRef.current);
      };
      document.addEventListener("fullscreenchange", onFullscreenChange);
      return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
    }, []);

    useEffect(() => {
      const video = videoRef.current;
      if (!video) return;
      const onEnterPip = () => setIsPipActive(true);
      const onLeavePip = () => setIsPipActive(false);
      video.addEventListener("enterpictureinpicture", onEnterPip);
      video.addEventListener("leavepictureinpicture", onLeavePip);
      return () => {
        video.removeEventListener("enterpictureinpicture", onEnterPip);
        video.removeEventListener("leavepictureinpicture", onLeavePip);
      };
    }, []);

    // ---- Close the speed menu on outside click ----
    useEffect(() => {
      if (!speedMenuOpen) return;
      const onClick = (e: MouseEvent) => {
        if (!speedMenuRef.current?.contains(e.target as Node)) setSpeedMenuOpen(false);
      };
      document.addEventListener("mousedown", onClick);
      return () => document.removeEventListener("mousedown", onClick);
    }, [speedMenuOpen]);

    // ---- Auto-hide controls while playing ----
    const scheduleHideControls = useCallback(() => {
      if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
      hideControlsTimer.current = setTimeout(() => {
        if (isPlaying && !scrubbing) setControlsVisible(false);
      }, CONTROLS_HIDE_DELAY);
    }, [isPlaying, scrubbing]);

    const wakeControls = useCallback(() => {
      setControlsVisible(true);
      scheduleHideControls();
    }, [scheduleHideControls]);

    useEffect(() => {
      if (!isPlaying) {
        setControlsVisible(true);
        if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
      } else {
        scheduleHideControls();
      }
      return () => {
        if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
      };
    }, [isPlaying, scheduleHideControls]);

    // ---- Playback actions ----
    const togglePlay = useCallback(() => {
      const video = videoRef.current;
      if (!video) return;
      if (video.paused) void video.play();
      else video.pause();
    }, []);

    const skip = useCallback((delta: number) => {
      const video = videoRef.current;
      if (!video) return;
      video.currentTime = clamp(video.currentTime + delta, 0, video.duration || 0);
    }, []);

    const seekTo = useCallback((time: number) => {
      const video = videoRef.current;
      if (!video) return;
      video.currentTime = clamp(time, 0, video.duration || 0);
    }, []);

    const toggleMute = useCallback(() => {
      const video = videoRef.current;
      if (!video) return;
      video.muted = !video.muted;
    }, []);

    const changeVolume = useCallback((next: number) => {
      const video = videoRef.current;
      if (!video) return;
      video.volume = clamp(next, 0, 1);
      if (next > 0 && video.muted) video.muted = false;
    }, []);

    const setRate = useCallback((rate: number) => {
      const video = videoRef.current;
      if (!video) return;
      video.playbackRate = rate;
      setSpeedMenuOpen(false);
    }, []);

    const toggleFullscreen = useCallback(() => {
      const container = containerRef.current;
      if (!container) return;
      if (document.fullscreenElement) void document.exitFullscreen();
      else void container.requestFullscreen();
    }, []);

    const togglePip = useCallback(async () => {
      const video = videoRef.current;
      if (!video) return;
      try {
        if (document.pictureInPictureElement) await document.exitPictureInPicture();
        else await video.requestPictureInPicture();
      } catch {
        // Silently ignore — PiP can be rejected by the browser (e.g. no user gesture).
      }
    }, []);

    // ---- Scrub bar (click + drag to seek) ----
    const ratioFromPointer = useCallback((clientX: number) => {
      const track = scrubTrackRef.current;
      if (!track) return 0;
      const rect = track.getBoundingClientRect();
      return clamp((clientX - rect.left) / rect.width, 0, 1);
    }, []);

    const handleScrubPointerDown = useCallback(
      (e: ReactPointerEvent<HTMLDivElement>) => {
        if (!duration) return;
        setScrubbing(true);
        const ratio = ratioFromPointer(e.clientX);
        setScrubPreview({ ratio, time: ratio * duration });
        seekTo(ratio * duration);
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
      },
      [duration, ratioFromPointer, seekTo],
    );

    const handleScrubPointerMove = useCallback(
      (e: ReactPointerEvent<HTMLDivElement>) => {
        if (!duration) return;
        const ratio = ratioFromPointer(e.clientX);
        setScrubPreview({ ratio, time: ratio * duration });
        if (scrubbing) seekTo(ratio * duration);
      },
      [duration, ratioFromPointer, scrubbing, seekTo],
    );

    const handleScrubPointerUp = useCallback(() => {
      setScrubbing(false);
    }, []);

    // ---- Volume bar (click + drag) ----
    const handleVolumePointer = useCallback(
      (e: ReactPointerEvent<HTMLDivElement>) => {
        const track = volumeTrackRef.current;
        if (!track) return;
        const rect = track.getBoundingClientRect();
        const ratio = clamp((e.clientX - rect.left) / rect.width, 0, 1);
        changeVolume(ratio);
      },
      [changeVolume],
    );

    // ---- Keyboard shortcuts ----
    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLDivElement>) => {
        switch (e.key.toLowerCase()) {
          case " ":
          case "k":
            e.preventDefault();
            togglePlay();
            break;
          case "arrowleft":
            e.preventDefault();
            skip(-5);
            break;
          case "arrowright":
            e.preventDefault();
            skip(5);
            break;
          case "j":
            skip(-SKIP_SECONDS);
            break;
          case "l":
            skip(SKIP_SECONDS);
            break;
          case "arrowup":
            e.preventDefault();
            changeVolume(volume + 0.05);
            break;
          case "arrowdown":
            e.preventDefault();
            changeVolume(volume - 0.05);
            break;
          case "m":
            toggleMute();
            break;
          case "f":
            toggleFullscreen();
            break;
        }
        wakeControls();
      },
      [changeVolume, skip, toggleFullscreen, togglePlay, toggleMute, volume, wakeControls],
    );

    const progressRatio = duration > 0 ? currentTime / duration : 0;
    const bufferedRatio = duration > 0 ? bufferedEnd / duration : 0;
    const VolumeIcon = muted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

    return (
      <div
        ref={containerRef}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onMouseMove={wakeControls}
        onMouseLeave={() => isPlaying && setControlsVisible(false)}
        className={cn(
          "group/player relative aspect-video w-full overflow-hidden rounded-xl bg-black text-white outline-none",
          "focus-visible:ring-2 focus-visible:ring-primary",
          isFullscreen && "rounded-none",
          className,
        )}
      >
        <video
          ref={videoRef}
          poster={poster}
          autoPlay={autoPlay}
          playsInline
          onClick={togglePlay}
          className="h-full w-full cursor-pointer object-contain"
        />

        {/* Buffering spinner */}
        {isBuffering && !error && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-10 w-10 animate-spin text-white/80" />
          </div>
        )}

        {/* Big center play button before first play */}
        {!hasStarted && !error && (
          <button
            type="button"
            aria-label="Play video"
            onClick={togglePlay}
            className="absolute inset-0 flex items-center justify-center bg-black/20 transition-colors hover:bg-black/30"
          >
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 text-black shadow-lg transition-transform hover:scale-105">
              <Play className="ml-1 h-7 w-7" fill="currentColor" />
            </span>
          </button>
        )}

        {/* Error state */}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black px-6 text-center">
            <p className="text-sm font-medium">{error}</p>
            <p className="text-xs text-white/60">Refresh the page to try again.</p>
          </div>
        )}

        {/* Chapter title, top-left */}
        {(title || activeChapter) && !error && (
          <div
            className={cn(
              "pointer-events-none absolute left-0 right-0 top-0 bg-gradient-to-b from-black/70 to-transparent p-4 transition-opacity duration-200",
              controlsVisible ? "opacity-100" : "opacity-0",
            )}
          >
            {title && <p className="text-sm font-medium">{title}</p>}
            {activeChapter && <p className="text-xs text-white/70">{activeChapter.title}</p>}
          </div>
        )}

        {/* Chapter list panel */}
        {chapterListOpen && sortedChapters.length > 0 && (
          <div className="absolute inset-y-0 right-0 z-20 flex w-64 flex-col bg-black/90 backdrop-blur">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <p className="text-sm font-medium">Chapters</p>
              <button
                type="button"
                aria-label="Close chapter list"
                onClick={() => setChapterListOpen(false)}
                className="rounded p-1 hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto py-1">
              {sortedChapters.map((chapter) => (
                <button
                  key={chapter.id}
                  type="button"
                  onClick={() => {
                    seekTo(chapter.start);
                    setChapterListOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left text-sm transition-colors hover:bg-white/10",
                    activeChapter?.id === chapter.id && "bg-white/10",
                  )}
                >
                  <span className="truncate">{chapter.title}</span>
                  <span className="shrink-0 text-xs tabular-nums text-white/50">
                    {formatTime(chapter.start)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Controls bar */}
        {!error && (
          <div
            className={cn(
              "absolute inset-x-0 bottom-0 flex flex-col gap-1.5 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-3 pb-2 pt-8 transition-opacity duration-200",
              controlsVisible ? "opacity-100" : "pointer-events-none opacity-0",
            )}
          >
            {/* Scrub bar */}
            <div
              ref={scrubTrackRef}
              role="slider"
              aria-label="Seek"
              aria-valuemin={0}
              aria-valuemax={duration}
              aria-valuenow={currentTime}
              onPointerDown={handleScrubPointerDown}
              onPointerMove={handleScrubPointerMove}
              onPointerUp={handleScrubPointerUp}
              onPointerLeave={() => !scrubbing && setScrubPreview(null)}
              className="group/scrub relative flex h-3 cursor-pointer items-center"
            >
              <div className="relative h-1 w-full overflow-hidden rounded-full bg-white/25 transition-all group-hover/scrub:h-1.5">
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-white/40"
                  style={{ width: `${bufferedRatio * 100}%` }}
                />
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-red-500"
                  style={{ width: `${progressRatio * 100}%` }}
                />
                {duration > 0 &&
                  sortedChapters.map((chapter) => (
                    <div
                      key={chapter.id}
                      className="absolute inset-y-0 w-px bg-black/40"
                      style={{ left: `${(chapter.start / duration) * 100}%` }}
                    />
                  ))}
              </div>
              <div
                className="pointer-events-none absolute h-3 w-3 -translate-x-1/2 rounded-full bg-red-500 opacity-0 shadow transition-opacity group-hover/scrub:opacity-100"
                style={{ left: `${progressRatio * 100}%` }}
              />
              {scrubPreview && (
                <div
                  className="pointer-events-none absolute bottom-4 -translate-x-1/2 rounded bg-black/90 px-2 py-1 text-xs tabular-nums"
                  style={{ left: `${scrubPreview.ratio * 100}%` }}
                >
                  {formatTime(scrubPreview.time)}
                </div>
              )}
            </div>

            {/* Buttons row */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label={isPlaying ? "Pause" : "Play"}
                onClick={togglePlay}
                className="rounded p-1.5 hover:bg-white/10"
              >
                {isPlaying ? (
                  <Pause className="h-4.5 w-4.5" fill="currentColor" />
                ) : (
                  <Play className="h-4.5 w-4.5" fill="currentColor" />
                )}
              </button>

              <button
                type="button"
                aria-label={`Back ${SKIP_SECONDS} seconds`}
                onClick={() => skip(-SKIP_SECONDS)}
                className="rounded p-1.5 hover:bg-white/10"
              >
                <SkipBack className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label={`Forward ${SKIP_SECONDS} seconds`}
                onClick={() => skip(SKIP_SECONDS)}
                className="rounded p-1.5 hover:bg-white/10"
              >
                <SkipForward className="h-4 w-4" />
              </button>

              {/* Volume */}
              <div className="flex items-center" onMouseEnter={() => wakeControls()}>
                <button
                  type="button"
                  aria-label={muted ? "Unmute" : "Mute"}
                  onClick={toggleMute}
                  className="rounded p-1.5 hover:bg-white/10"
                >
                  <VolumeIcon className="h-4 w-4" />
                </button>
                <div
                  ref={volumeTrackRef}
                  role="slider"
                  aria-label="Volume"
                  aria-valuemin={0}
                  aria-valuemax={1}
                  aria-valuenow={muted ? 0 : volume}
                  onPointerDown={(e) => {
                    handleVolumePointer(e);
                    (e.target as HTMLElement).setPointerCapture(e.pointerId);
                  }}
                  onPointerMove={(e) => e.buttons === 1 && handleVolumePointer(e)}
                  className="ml-0.5 hidden w-16 cursor-pointer items-center sm:flex"
                >
                  <div className="relative h-1 w-full rounded-full bg-white/25">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full bg-white"
                      style={{ width: `${(muted ? 0 : volume) * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              <span className="ml-1 select-none text-xs tabular-nums text-white/80">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>

              <div className="ml-auto flex items-center gap-1">
                {sortedChapters.length > 0 && (
                  <button
                    type="button"
                    aria-label="Chapters"
                    onClick={() => setChapterListOpen((v) => !v)}
                    className={cn(
                      "rounded p-1.5 hover:bg-white/10",
                      chapterListOpen && "bg-white/10",
                    )}
                  >
                    <ListVideo className="h-4 w-4" />
                  </button>
                )}

                {/* Playback speed */}
                <div ref={speedMenuRef} className="relative">
                  <button
                    type="button"
                    aria-label="Playback speed"
                    onClick={() => setSpeedMenuOpen((v) => !v)}
                    className={cn(
                      "flex items-center gap-1 rounded px-1.5 py-1.5 text-xs hover:bg-white/10",
                      speedMenuOpen && "bg-white/10",
                    )}
                  >
                    <Settings className="h-4 w-4" />
                    <span className="tabular-nums">{playbackRate}x</span>
                  </button>
                  {speedMenuOpen && (
                    <div className="absolute bottom-full right-0 mb-2 w-28 overflow-hidden rounded-md bg-black/95 py-1 text-sm shadow-lg">
                      {PLAYBACK_RATES.map((rate) => (
                        <button
                          key={rate}
                          type="button"
                          onClick={() => setRate(rate)}
                          className={cn(
                            "flex w-full items-center justify-between px-3 py-1.5 hover:bg-white/10",
                            rate === playbackRate && "text-red-400",
                          )}
                        >
                          {rate === 1 ? "Normal" : `${rate}x`}
                          {rate === playbackRate && <ChevronRight className="h-3.5 w-3.5" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {pipSupported && (
                  <button
                    type="button"
                    aria-label={isPipActive ? "Exit mini player" : "Mini player"}
                    onClick={togglePip}
                    className={cn(
                      "hidden rounded p-1.5 hover:bg-white/10 sm:inline-flex",
                      isPipActive && "bg-white/10",
                    )}
                  >
                    <PictureInPicture2 className="h-4 w-4" />
                  </button>
                )}

                <button
                  type="button"
                  aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
                  onClick={toggleFullscreen}
                  className="rounded p-1.5 hover:bg-white/10"
                >
                  {isFullscreen ? (
                    <Minimize className="h-4 w-4" />
                  ) : (
                    <Maximize className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  },
);

export default VideoPlayer;