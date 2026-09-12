"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Users } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type Student = {
  id: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  subscriptions: Array<{
    planId: string;
    planName: string;
    domainName: string;
    billingCycle: string;
    expiresAt: string;
  }>;
  progress: {
    completedChapters: number;
    startedChapters: number;
    lastActivity: string | null;
    courses: Array<{ title: string; completed: number; started: number }>;
  };
};

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/students")
      .then(async (response) => {
        const json = await response.json();
        if (!response.ok) throw new Error(json.error?.message || "Could not load students.");
        setStudents(json.data?.students ?? []);
      })
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Could not load students."))
      .finally(() => setLoading(false));
  }, []);

  const filteredStudents = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return students;
    return students.filter((student) =>
      `${student.fullName} ${student.email}`.toLowerCase().includes(normalized),
    );
  }, [query, students]);

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-medium text-primary">Your learners</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Students</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Students with an active pack that includes one of your courses.
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search students" className="pl-9" />
        </div>
      </div>

      {error && <p className="mt-8 text-sm text-destructive">{error}</p>}
      {loading ? (
        <div className="mt-10 space-y-3">
          <div className="h-20 animate-pulse rounded-xl bg-muted" />
          <div className="h-20 animate-pulse rounded-xl bg-muted" />
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="mt-10 flex min-h-52 flex-col items-center justify-center rounded-xl bg-muted/40 text-center">
          <Users className="size-8 text-muted-foreground/60" />
          <p className="mt-3 text-sm font-medium">No active students yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Students appear here when they subscribe to your course domains.</p>
        </div>
      ) : (
        <div className="mt-8 divide-y rounded-xl border bg-card">
          {filteredStudents.map((student) => (
            <article key={student.id} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                {student.avatarUrl ? (
                  <img src={student.avatarUrl} alt="" className="size-10 shrink-0 rounded-full object-cover" />
                ) : (
                  <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">{initials(student.fullName) || "?"}</span>
                )}
                <div className="min-w-0">
                  <h2 className="truncate text-sm font-semibold">{student.fullName}</h2>
                  <p className="truncate text-sm text-muted-foreground">{student.email}</p>
                </div>
              </div>
              <div className="flex flex-wrap justify-start gap-2 sm:justify-end">
                {student.subscriptions.map((subscription) => (
                  <Badge key={`${student.id}-${subscription.planId}`} variant="secondary" className="font-normal">
                    {subscription.planName} · until {new Date(subscription.expiresAt).toLocaleDateString()}
                  </Badge>
                ))}
              </div>
              <div className="w-full border-t border-border pt-3 sm:ml-14 sm:w-auto sm:border-t-0 sm:pt-0">
                <p className="text-xs font-medium text-foreground">
                  {student.progress.completedChapters} completed chapters
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {student.progress.startedChapters} started
                  {student.progress.lastActivity ? ` · active ${new Date(student.progress.lastActivity).toLocaleDateString()}` : " · no activity yet"}
                </p>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}