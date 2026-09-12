"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, CalendarDays, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

type Course = {
  id: string;
  title: string;
  description: string | null;
  categories: string[];
  chapterCount: number;
};
type Professor = {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  bio: string | null;
  specialties: string | null;
  websiteUrl: string | null;
  memberSince: string;
  isAuthenticated: boolean;
  isOwner: boolean;
  viewerRating: number | null;
  stats: {
    courseCount: number;
    chapterCount: number;
    ratingCount: number;
    averageRating: number | null;
  };
  courses: Course[];
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

function ProfileSkeleton() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[280px_1fr]">
        <div>
          <Skeleton className="size-32 rounded-full" />
          <Skeleton className="mt-4 h-7 w-40" />
          <Skeleton className="mt-2 h-4 w-24" />
          <Separator className="my-4" />
          <Skeleton className="h-4 w-36" />
          <Skeleton className="mt-2 h-4 w-32" />
          <Skeleton className="mt-2 h-4 w-28" />
        </div>
        <div>
          <Skeleton className="h-6 w-24" />
          <Separator className="my-3" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="mt-3 h-24 w-full" />
        </div>
      </div>
    </main>
  );
}

export default function PublicProfessorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [professor, setProfessor] = useState<Professor | null>(null);
  const [error, setError] = useState("");
  const [rating, setRating] = useState(0);
  const [savingRating, setSavingRating] = useState(false);

  useEffect(() => {
    params.then(({ id }) =>
      fetch(`/api/professors/${id}`)
        .then(async (response) => {
          const json = await response.json();
          if (!response.ok)
            throw new Error(json.error?.message ?? "Professor not found");
          setProfessor(json.data);
          setRating(json.data.viewerRating ?? 0);
        })
        .catch((reason) => setError(reason.message)),
    );
  }, [params]);

  async function saveRating(value: number) {
    if (!professor?.isAuthenticated) return;
    setRating(value);
    setSavingRating(true);
    await fetch(`/api/professors/${professor.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating: value }),
    });
    setSavingRating(false);
  }

  if (error)
    return (
      <main className="mx-auto max-w-3xl px-6 py-20">
        <h1 className="text-2xl font-semibold">{error}</h1>
        <Link className="mt-4 inline-block text-sm text-primary hover:underline" href="/learn">
          Back to courses
        </Link>
      </main>
    );

  if (!professor) return <ProfileSkeleton />;

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[280px_1fr]">
        {/* Left sidebar, GitHub profile style */}
        <aside className="lg:sticky lg:top-10 lg:self-start">
          <Avatar className="size-32">
            <AvatarImage src={professor.avatarUrl ?? undefined} alt={professor.fullName} />
            <AvatarFallback className="text-2xl">
              {initials(professor.fullName)}
            </AvatarFallback>
          </Avatar>

          <h1 className="mt-4 text-2xl font-bold leading-tight text-foreground">
            {professor.fullName}
          </h1>
          <p className="mt-1 text-lg font-light text-muted-foreground">
            Professor
          </p>

          {professor.bio && <p className="mt-4 text-sm leading-6 text-muted-foreground">{professor.bio}</p>}
          {professor.specialties && <p className="mt-3 text-xs font-medium uppercase tracking-wide text-primary">{professor.specialties}</p>}
          {professor.websiteUrl && <a href={professor.websiteUrl} target="_blank" rel="noreferrer" className="mt-3 block text-sm text-primary hover:underline">Visit website</a>}

          {professor.isOwner ? (
            <Button asChild variant="outline" className="mt-4 w-full">
              <Link href="/settings">Edit profile</Link>
            </Button>
          ) : !professor.isAuthenticated ? (
            <Button asChild className="mt-4 w-full">
              <Link href="/register?mode=login">Log in to interact</Link>
            </Button>
          ) : null}

          <Separator className="mt-5" />

          <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <CalendarDays className="size-4 shrink-0" />
              Teaching since {formatDate(professor.memberSince)}
            </li>
            <li className="flex items-center gap-2">
              <BookOpen className="size-4 shrink-0" />
              <span className="font-semibold text-foreground">
                {professor.stats.courseCount}
              </span>
              courses ·
              <span className="font-semibold text-foreground">
                {professor.stats.chapterCount}
              </span>
              chapters
            </li>
            <li className="flex items-center gap-2">
              <Star className="size-4 shrink-0" />
              {professor.stats.averageRating ? (
                <>
                  <span className="font-semibold text-foreground">
                    {professor.stats.averageRating}
                  </span>
                  / 5 from {professor.stats.ratingCount} rating
                  {professor.stats.ratingCount === 1 ? "" : "s"}
                </>
              ) : (
                "No ratings yet"
              )}
            </li>
          </ul>

          <Separator className="mt-5" />

          <div className="mt-4">
            {professor.isOwner ? (
              <p className="text-xs text-muted-foreground">
                You can&apos;t rate your own profile.
              </p>
            ) : professor.isAuthenticated ? (
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    disabled={savingRating}
                    onClick={() => void saveRating(value)}
                    aria-label={`Rate ${value} stars`}
                    className={
                      value <= rating
                        ? "text-amber-500 transition-colors"
                        : "text-muted-foreground/30 transition-colors hover:text-amber-500/60"
                    }
                  >
                    <Star className="size-5 fill-current" />
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Log in to rate this professor.
              </p>
            )}
          </div>
        </aside>

        {/* Right column: courses list */}
        <section className="min-w-0">
          <h2 className="text-base font-semibold text-foreground">Courses</h2>
          <Separator className="mt-2" />

          {professor.courses.length === 0 ? (
            <p className="py-6 text-sm text-muted-foreground">
              {professor.fullName} hasn&apos;t published any courses yet.
            </p>
          ) : (
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {professor.courses.map((course) => (
                <Card key={course.id} className="flex flex-col">
                  <CardHeader className="space-y-1.5">
                    <CardTitle className="text-base">
                      <Link
                        href={`/learn/${course.id}`}
                        className="text-primary hover:underline"
                      >
                        {course.title}
                      </Link>
                    </CardTitle>
                    {course.description && (
                      <CardDescription className="line-clamp-2">
                        {course.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="mt-auto flex items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {course.categories.slice(0, 2).map((category) => (
                        <Badge key={category} variant="secondary">
                          {category}
                        </Badge>
                      ))}
                      <Badge variant="outline" className="gap-1 font-normal">
                        <BookOpen className="size-3" />
                        {course.chapterCount}
                      </Badge>
                    </div>
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/learn/${course.id}`}>Open</Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <p className="mt-8 text-xs text-muted-foreground">
            Public profile — course content remains protected by pack access.
          </p>
        </section>
      </div>
    </main>
  );
}