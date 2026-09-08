"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  Camera,
  Loader2,
  Mail,
  Phone,
  CalendarDays,
  BookOpen,
  CheckCircle2,
  Circle,
  Pencil,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Course = {
  id: string;
  title: string;
  published: boolean;
  _count: { chapters: number };
};

type Profile = {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  avatarUrl: string | null;
  createdAt: string;
  roles: string[];
  coursesTaught: Course[];
};

const ROLE_LABELS: Record<string, string> = {
  student: "Student",
  professor: "Professor",
  admin: "Admin",
};

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function formatMemberSince(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [editing, setEditing] = useState(false);
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
        }
      } catch {
        if (!cancelled) setLoadError("We couldn't load your profile. Try refreshing.");
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
      setEditing(false);
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
    setEditing(false);
  }

  async function handleAvatarChange(event: React.ChangeEvent<HTMLInputElement>) {
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
        <p className="text-sm text-muted-foreground">{loadError || "Profile not found."}</p>
      </div>
    );
  }

  const isProfessor = profile.roles.includes("professor") || profile.coursesTaught.length > 0;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
      {/* HEADER */}
      <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
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
            className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border border-background bg-foreground text-background transition hover:opacity-90 disabled:opacity-60"
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

        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold text-foreground sm:text-2xl">
            {profile.fullName}
          </h1>

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" />
              {profile.email}
            </span>
            <span className="flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" />
              Member since {formatMemberSince(profile.createdAt)}
            </span>
          </div>

          {profile.roles.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {profile.roles.map((role) => (
                <span
                  key={role}
                  className="rounded-full border border-muted bg-muted/40 px-2.5 py-0.5 text-xs text-foreground"
                >
                  {ROLE_LABELS[role] ?? role}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {uploadError && <p className="mt-3 text-sm text-destructive">{uploadError}</p>}

      {/* ACCOUNT DETAILS */}
      <section className="mt-10 rounded-lg border border-muted">
        <div className="flex items-center justify-between border-b border-muted px-5 py-4">
          <h2 className="text-sm font-medium text-foreground">Account details</h2>
          {!editing && (
            <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => setEditing(true)}>
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Button>
          )}
        </div>

        <div className="px-5 py-5">
          {editing ? (
            <form onSubmit={handleSaveDetails} className="space-y-4">
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

              {saveError && <p className="text-sm text-destructive">{saveError}</p>}

              <div className="flex items-center gap-2 pt-1">
                <Button type="submit" size="sm" disabled={saving} className="gap-1.5">
                  {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Save changes
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={cancelEditing}
                  disabled={saving}
                  className="gap-1.5"
                >
                  <X className="h-3.5 w-3.5" />
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs text-muted-foreground">Full name</dt>
                <dd className="mt-1 text-sm text-foreground">{profile.fullName}</dd>
              </div>
              <div>
                <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Phone className="h-3 w-3" /> Phone
                </dt>
                <dd className="mt-1 text-sm text-foreground">
                  {profile.phone || <span className="text-muted-foreground">Not set</span>}
                </dd>
              </div>
            </dl>
          )}
        </div>
      </section>

      {/* COURSES TAUGHT */}
      {isProfessor && (
        <section className="mt-8 rounded-lg border border-muted">
          <div className="flex items-center justify-between border-b border-muted px-5 py-4">
            <h2 className="text-sm font-medium text-foreground">Courses you teach</h2>
            <span className="text-xs text-muted-foreground">
              {profile.coursesTaught.length}{" "}
              {profile.coursesTaught.length === 1 ? "course" : "courses"}
            </span>
          </div>

          {profile.coursesTaught.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-sm text-muted-foreground">
                You haven&apos;t created a course yet.
              </p>
              <Link href="/courses/new" className="mt-3 inline-block">
                <Button size="sm">Create your first course</Button>
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-muted">
              {profile.coursesTaught.map((course) => (
                <li key={course.id}>
                  <Link
                    href={`/courses/${course.id}/edit`}
                    className="flex items-center justify-between gap-4 px-5 py-3.5 transition hover:bg-muted/30"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <BookOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="truncate text-sm text-foreground">{course.title}</span>
                    </div>

                    <div className="flex shrink-0 items-center gap-4">
                      <span className="text-xs text-muted-foreground">
                        {course._count.chapters}{" "}
                        {course._count.chapters === 1 ? "chapter" : "chapters"}
                      </span>
                      <span className="flex items-center gap-1 text-xs">
                        {course.published ? (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                            <span className="text-foreground">Published</span>
                          </>
                        ) : (
                          <>
                            <Circle className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-muted-foreground">Draft</span>
                          </>
                        )}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}