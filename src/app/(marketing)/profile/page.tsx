"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  Camera,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Loader2,
  Mail,
  Flame,
  Target,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Profile = {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  avatarUrl: string | null;
  createdAt: string;
  roles: string[];
};

type StudentProgress = {
  completedChapters: number;
  inProgressChapters: number;
  overallCompletion: number;
  streak: number;
  activeDays: number;
  activityDates: string[];
  nextUp: {
    courseId: string;
    courseTitle: string;
    chapterTitle: string | null;
    chapterId: string | null;
  } | null;
  courseProgress: Array<{
    courseId: string;
    courseTitle: string;
    totalChapters: number;
    completedChapters: number;
    percent: number;
    nextChapter: string | null;
    nextChapterId: string | null;
  }>;
};

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [studentProgress, setStudentProgress] = useState<StudentProgress | null>(null);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/profile", { credentials: "include" });
        if (!res.ok) throw new Error("Failed to load profile.");
        const json = await res.json();
        const data: Profile = json.data ?? json;
        if (!cancelled) {
          setProfile(data);
          setFullName(data.fullName);
          setPhone(data.phone ?? "");
          if (!data.roles.some((role) => ["prof", "admin"].includes(role))) {
            const progressResponse = await fetch("/api/learning/catalog", { credentials: "include" });
            if (progressResponse.ok) {
              const progressJson = await progressResponse.json();
              setStudentProgress(progressJson.data?.studentProgress ?? null);
            }
          }
        }
      } catch {
        if (!cancelled)
          setLoadError("We couldn't load your profile. Try refreshing.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSaveDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaveError("");

    if (fullName.trim().length < 2) {
      setSaveError("Full name must be at least 2 characters.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          phone: phone.trim() || null,
        }),
      });
      if (!res.ok) throw new Error("Update failed");
      const json = await res.json();
      const updated = json.data ?? json;
      setProfile((prev) => (prev ? { ...prev, ...updated } : prev));
    } catch {
      setSaveError("Couldn't save your changes. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function cancelEditing() {
    if (!profile) return;
    setFullName(profile.fullName);
    setPhone(profile.phone ?? "");
    setSaveError("");
  }

  async function handleAvatarChange(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadError("");

    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      setUploadError("Upload a JPEG, PNG, or WebP image.");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setUploadError("Image must be 4 MB or smaller.");
      return;
    }

    const formData = new FormData();
    formData.append("avatar", file);

    setUploading(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        credentials: "include",
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      const json = await res.json();
      const updated = json.data ?? json;
      setProfile((prev) => (prev ? { ...prev, ...updated } : prev));
    } catch {
      setUploadError("Couldn't upload that image. Please try again.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (loadError || !profile) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <p className="text-sm text-muted-foreground">
          {loadError || "Profile not found."}
        </p>
      </div>
    );
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:py-14">
      {studentProgress && (
        <section className="mb-10 border-b border-border pb-10">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-medium text-primary">Student profile</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight">Your learning space</h1>
              <p className="mt-2 text-sm text-muted-foreground">A quiet record of the work you are building, one lesson at a time.</p>
            </div>
            {studentProgress.nextUp && (
              <Button asChild size="sm">
                <a href={studentProgress.nextUp.chapterId ? `/learn/${studentProgress.nextUp.courseId}?chapter=${studentProgress.nextUp.chapterId}` : `/learn/${studentProgress.nextUp.courseId}`}>
                  Continue learning <ArrowRight className="ml-2 size-4" />
                </a>
              </Button>
            )}
          </div>

          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between text-muted-foreground"><span className="text-xs">Completion</span><Target className="size-4" /></div>
              <p className="mt-2 text-2xl font-semibold">{studentProgress.overallCompletion}%</p>
              <p className="mt-1 text-xs text-muted-foreground">Across tracked lessons</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between text-muted-foreground"><span className="text-xs">Chapters finished</span><CheckCircle2 className="size-4" /></div>
              <p className="mt-2 text-2xl font-semibold">{studentProgress.completedChapters}</p>
              <p className="mt-1 text-xs text-muted-foreground">Knowledge banked</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between text-muted-foreground"><span className="text-xs">Current streak</span><Flame className="size-4" /></div>
              <p className="mt-2 text-2xl font-semibold">{studentProgress.streak} days</p>
              <p className="mt-1 text-xs text-muted-foreground">{studentProgress.activeDays} active days total</p>
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-border bg-card p-4 sm:p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold">Learning activity</h2>
                <p className="mt-1 text-xs text-muted-foreground">Your consistency over the last year</p>
              </div>
              <span className="text-xs text-muted-foreground">{studentProgress.activeDays} active days</span>
            </div>
            <div className="mt-4 flex gap-1.5 overflow-hidden">
              {Array.from({ length: 52 }, (_, week) => (
                <div key={week} className="grid shrink-0 gap-1" style={{ gridTemplateRows: "repeat(7, 10px)" }}>
                  {Array.from({ length: 7 }, (_, day) => {
                    const date = new Date();
                    date.setDate(date.getDate() - ((51 - week) * 7 + (6 - day)));
                    const active = studentProgress.activityDates.includes(date.toISOString().slice(0, 10));
                    return <span key={day} className={`size-2.5 rounded-[3px] ${active ? "bg-primary" : "bg-muted"}`} />;
                  })}
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Less</span>
              <span className="flex items-center gap-1"><span className="size-2.5 rounded-[3px] bg-muted" /><span className="size-2.5 rounded-[3px] bg-primary/40" /><span className="size-2.5 rounded-[3px] bg-primary" />More</span>
            </div>
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            {studentProgress.courseProgress.map((course) => (
              <div key={course.courseId} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3"><div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted"><BookOpen className="size-4 text-muted-foreground" /></div><p className="truncate text-sm font-medium">{course.courseTitle}</p></div>
                  <span className="text-xs font-semibold">{course.percent}%</span>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${course.percent}%` }} /></div>
                <div className="mt-2 flex items-center justify-between gap-3 text-xs text-muted-foreground"><span>{course.completedChapters}/{course.totalChapters} chapters</span><a className="font-medium text-foreground hover:text-primary" href={course.nextChapterId ? `/learn/${course.courseId}?chapter=${course.nextChapterId}` : `/learn/${course.courseId}`}>{course.nextChapter ? "Resume" : "Review"}</a></div>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="mx-auto max-w-2xl">
      <form onSubmit={handleSaveDetails} className="space-y-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Edit profile
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Update your personal information and profile photo.
          </p>
        </div>

        <div className="flex flex-col gap-5 rounded-lg border border-border bg-card p-5 sm:flex-row sm:items-center">
        <div className="relative shrink-0">
          <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-muted text-lg font-medium text-foreground sm:h-24 sm:w-24">
            {profile.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatarUrl}
                alt={profile.fullName}
                className="h-full w-full object-cover"
              />
            ) : (
              initials(profile.fullName)
            )}
          </div>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            aria-label="Change profile photo"
            className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-foreground text-background transition hover:opacity-90 disabled:opacity-60"
          >
            {uploading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Camera className="h-3.5 w-3.5" />
            )}
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleAvatarChange}
          />
        </div>

          <div>
            <p className="text-sm font-medium text-foreground">Profile photo</p>
            <p className="mt-1 text-xs text-muted-foreground">
              JPEG, PNG, or WebP up to 4 MB.
            </p>
          </div>
        </div>

      {uploadError && (
        <p className="mt-3 text-sm text-destructive">{uploadError}</p>
      )}

        <section className="space-y-5 rounded-lg border border-border bg-card p-5">
          <h2 className="text-sm font-medium text-foreground">
            Personal information
          </h2>

          <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="fullName">Full name</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  minLength={2}
                  maxLength={120}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  maxLength={30}
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input id="email" value={profile.email} readOnly className="pl-8" />
                </div>
                <p className="text-xs text-muted-foreground">
                  Email is tied to your login and cannot be changed here.
                </p>
              </div>
          </div>
        </section>

        {saveError && <p className="text-sm text-destructive">{saveError}</p>}

        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="outline" onClick={cancelEditing} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving} className="gap-1.5">
            {saving && <Loader2 className="size-3.5 animate-spin" />}
            Save changes
          </Button>
        </div>
      </form>
      </div>
    </main>
  );
}
