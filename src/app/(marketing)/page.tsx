"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, PenLine, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// ---------------------------------------------------------------------------
// Content
// ---------------------------------------------------------------------------

const quickLinks = [
  { label: "Sciences", href: "/courses?category=Sciences" },
  { label: "Langues", href: "/courses?category=Langues" },
  {
    label: "Sciences humaines",
    href: "/courses?category=Sciences+humaines",
  },
  {
    label: "Vie professionnelle",
    href: "/courses?category=Professionnel",
  },
];

const bacTracks = [
  {
    id: "bac-math",
    title: "Bac Mathématiques",
    short: "Math",
    description: "Maths · Physique · Informatique",
    courses: 34,
    students: 1280,
  },
  {
    id: "bac-sciences",
    title: "Bac Sciences expérimentales",
    short: "Sciences",
    description: "SVT · Physique · Chimie",
    courses: 42,
    students: 1640,
  },
  {
    id: "bac-info",
    title: "Bac Sciences de l'informatique",
    short: "Info",
    description: "Programmation · Algo · Systèmes",
    courses: 29,
    students: 970,
  },
  {
    id: "bac-technique",
    title: "Bac Technique",
    short: "Technique",
    description: "Technique · Maths · Physique",
    courses: 26,
    students: 820,
  },
  {
    id: "bac-economie",
    title: "Bac Économie & Gestion",
    short: "Économie",
    description: "Économie · Gestion · Maths",
    courses: 31,
    students: 1130,
  },
  {
    id: "bac-lettres",
    title: "Bac Lettres",
    short: "Lettres",
    description: "Français · Philosophie · Arabe",
    courses: 24,
    students: 760,
  },
  
] as const;

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function HomePage() {
  const [professorQuery, setProfessorQuery] = useState("");

  const [professors, setProfessors] = useState<
    Array<{
      id: string;
      fullName: string;
      courseCount: number;
    }>
  >([]);

  useEffect(() => {
    const query = professorQuery.trim();

    if (query.length < 2) {
      setProfessors([]);
      return;
    }

    const controller = new AbortController();

    const timeout = window.setTimeout(() => {
      fetch(`/api/professors?q=${encodeURIComponent(query)}`, {
        signal: controller.signal,
      })
        .then(async (response) => {
          if (!response.ok) {
            setProfessors([]);
            return;
          }

          const json: {
            data?: Array<{
              id: string;
              fullName: string;
              courseCount: number;
            }>;
          } = await response.json();

          setProfessors(json.data ?? []);
        })
        .catch(() => {
          setProfessors([]);
        });
    }, 250);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [professorQuery]);

  const visibleProfessors =
    professorQuery.trim().length >= 2 ? professors : [];

  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* ----------------------------------------------------------------- */}
      {/* Search                                                           */}
      {/* ----------------------------------------------------------------- */}

      <section className="border-b border-border">
        <div className="mx-auto max-w-5xl px-6 pb-10 pt-14 sm:pt-16">
          <h1 className="max-w-2xl text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
            Cherchez un prof, une matière, ou parcourez ce qui se donne en ce
            moment.
          </h1>

          <form
            action="/courses"
            method="get"
            className="relative mt-6 max-w-xl"
          >
            <div className="flex items-stretch rounded-md border border-border bg-card">
              <div className="flex items-center pl-4">
                <Search className="h-4 w-4 text-muted-foreground" />
              </div>

              <Input
                name="q"
                value={professorQuery}
                onChange={(event) =>
                  setProfessorQuery(event.target.value)
                }
                placeholder="Ex : Sami Bouzid, dérivées, Excel..."
                className="h-12 border-0 bg-transparent shadow-none focus-visible:ring-0"
              />

              <Button type="submit" className="m-1.5 h-9 px-5">
                Rechercher
              </Button>
            </div>

            {visibleProfessors.length > 0 && (
              <div className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-md border border-border bg-popover shadow-lg">
                <p className="border-b border-border px-4 py-2 text-xs text-muted-foreground">
                  Professeurs correspondants
                </p>

                {visibleProfessors.map((professor) => (
                  <Link
                    key={professor.id}
                    href={`/professors/${professor.id}`}
                    onClick={() => setProfessors([])}
                    className="flex items-center justify-between px-4 py-3 text-sm transition-colors hover:bg-muted"
                  >
                    <span>{professor.fullName}</span>

                    <span className="text-xs text-muted-foreground">
                      {professor.courseCount} cours
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </form>

          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
            {quickLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* Tunisian Baccalaureate sections                                  */}
      {/* ----------------------------------------------------------------- */}

      <section className="border-b border-border">
        <div className="mx-auto max-w-5xl px-6 py-14 sm:py-16">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
                Préparez votre Bac
              </h2>

              <p className="mt-1.5 text-sm text-muted-foreground">
                Choisissez votre section et retrouvez les cours adaptés à
                votre programme.
              </p>
            </div>

            <Link
              href="/courses"
              className="flex shrink-0 items-center gap-1 text-sm font-medium text-primary"
            >
              Tous les cours
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="mt-8 grid grid-cols-1 divide-y divide-border border-y border-border sm:grid-cols-2 sm:divide-x lg:grid-cols-3">
            {bacTracks.map((track, index) => (
              <Link
                key={track.id}
                href={`/courses?level=bac&track=${encodeURIComponent(
                  track.short,
                )}`}
                className="group relative flex min-h-[180px] flex-col px-1 py-6 transition-colors hover:bg-muted/40 sm:px-6"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] text-muted-foreground/70">
                    N&deg;&nbsp;{String(index + 1).padStart(2, "0")}
                  </span>

                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/50 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-foreground" />
                </div>

                <div className="mt-5">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    {track.short}
                  </p>

                  <h3 className="mt-1.5 text-[15px] font-medium leading-snug">
                    {track.title}
                  </h3>

                  <p className="mt-1.5 text-xs text-muted-foreground">
                    {track.description}
                  </p>
                </div>

                <div className="mt-auto flex items-end justify-between border-t border-border/70 pt-3 text-xs">
                  <div>
                    <span className="font-medium text-foreground">
                      {track.courses}
                    </span>{" "}
                    <span className="text-muted-foreground">
                      cours
                    </span>
                  </div>

                  <span className="text-muted-foreground">
                    {track.students.toLocaleString("fr-FR")} apprenants
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* For teachers                                                     */}
      {/* ----------------------------------------------------------------- */}

      <section className="border-b border-border bg-foreground text-background">
        <div className="mx-auto grid max-w-5xl gap-10 px-6 py-16 sm:py-20 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="max-w-xl">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Vous savez expliquer. Partagez-le.
            </h2>

            <p className="mt-4 text-sm leading-7 text-background/70 sm:text-base">
              Structurez vos cours en chapitres, suivez la progression de vos
              élèves, et touchez des apprenants bien au-delà de votre salle de
              classe — du collège à la formation pour adultes.
            </p>

            <ul className="mt-6 space-y-3 text-sm text-background/80">
              <li className="flex gap-3">
                <PenLine className="mt-0.5 h-4 w-4 shrink-0" />
                Publiez à votre rythme, chapitre par chapitre.
              </li>

              <li className="flex gap-3">
                <PenLine className="mt-0.5 h-4 w-4 shrink-0" />
                Gardez la main sur votre contenu et vos tarifs.
              </li>

              <li className="flex gap-3">
                <PenLine className="mt-0.5 h-4 w-4 shrink-0" />
                Suivez la progression réelle de chaque élève.
              </li>
            </ul>
          </div>

          <div className="lg:justify-self-end">
            <Button asChild size="lg" variant="secondary">
              <Link href="/devenir-professeur">
                Devenir professeur sur Curio
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* Final CTA                                                        */}
      {/* ----------------------------------------------------------------- */}

      <section className="mx-auto max-w-5xl px-6 py-16 sm:py-20">
        <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Prêt à commencer ?
            </h2>

            <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              Un premier chapitre gratuit, quel que soit votre âge ou votre
              point de départ.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/courses">
                Commencer à apprendre
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>

            <Button asChild size="lg" variant="outline">
              <Link href="/devenir-professeur">
                Devenir professeur
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
