"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  Camera,
  Loader2,
  Mail,
  Phone,
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
    <main className="mx-auto w-full max-w-2xl px-4 py-10 sm:py-14">
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
    </main>
  );
}
