"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Clock3,
  PenLine,
  Search,
  Star,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// ---------------------------------------------------------------------------
// Content
// ---------------------------------------------------------------------------

const quickLinks = [
  { label: "Sciences", href: "/courses?category=Sciences" },
  { label: "Langues", href: "/courses?category=Langues" },
  { label: "Sciences humaines", href: "/courses?category=Sciences+humaines" },
  { label: "Vie professionnelle", href: "/courses?category=Professionnel" },
];

const board = [
  {
    id: "maths-fonctions",
    prof: "Sami Bouzid",
    role: "Professeur de mathématiques",
    title: "Fonctions et suites numériques",
    nextChapter: "Chapitre 4 : la fonction dérivée",
    level: "Lycée",
    chapters: 12,
    duration: "3 h 45",
    rating: 4.9,
    accent: "ochre",
  },
  {
    id: "corps-humain",
    prof: "Ines Rekik",
    role: "Professeure de sciences",
    title: "Le corps humain, en détail",
    nextChapter: "Chapitre 2 : le système digestif",
    level: "Collège",
    chapters: 6,
    duration: "1 h 50",
    rating: 4.8,
    accent: "ochre",
  },
  {
    id: "francais-commentaire",
    prof: "Amira Sassi",
    role: "Professeure de lettres",
    title: "Maîtriser le commentaire composé",
    nextChapter: "Chapitre 2 : construire un plan",
    level: "Lycée",
    chapters: 9,
    duration: "2 h 20",
    rating: 4.8,
    accent: "teal",
  },
  {
    id: "anglais-pro",
    prof: "Nadia Kort",
    role: "Formatrice en langues",
    title: "Anglais professionnel : présenter son travail",
    nextChapter: "Chapitre 1 : se présenter en réunion",
    level: "Adultes",
    chapters: 7,
    duration: "2 h 10",
    rating: 4.9,
    accent: "teal",
  },
  {
    id: "philo-conscience",
    prof: "Mehdi Ouali",
    role: "Professeur de philosophie",
    title: "La conscience",
    nextChapter: "Chapitre 5 : la conscience de soi",
    level: "Lycée",
    chapters: 8,
    duration: "2 h 50",
    rating: 4.7,
    accent: "ink",
  },
  {
    id: "excel-debutant",
    prof: "Karim Trabelsi",
    role: "Formateur bureautique",
    title: "Excel : les bases pour bien démarrer",
    nextChapter: "Chapitre 3 : les formules simples",
    level: "Adultes",
    chapters: 10,
    duration: "3 h 00",
    rating: 4.7,
    accent: "umber",
  },
  {
    id: "python-debutant",
    prof: "Youssef Ben Ali",
    role: "Formateur en informatique",
    title: "Premiers pas avec Python",
    nextChapter: "Chapitre 1 : variables et types",
    level: "Adultes",
    chapters: 11,
    duration: "3 h 20",
    rating: 4.9,
    accent: "umber",
  },
] as const;

type Accent = "ochre" | "teal" | "umber" | "ink";

const accentBar: Record<Accent, string> = {
  ochre: "bg-[#C8872E]",
  teal: "bg-[#1F4F47]",
  umber: "bg-[#6B4F3A]",
  ink: "bg-foreground/60",
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function HomePage() {
  const [professorQuery, setProfessorQuery] = useState("");
  const [professors, setProfessors] = useState<
    Array<{ id: string; fullName: string; courseCount: number }>
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
        .then((response) => response.json())
        .then((json) => setProfessors(json.data ?? []))
        .catch(() => setProfessors([]));
    }, 250);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [professorQuery]);

  const visibleProfessors = professorQuery.trim().length >= 2 ? professors : [];

  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Search */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-5xl px-6 pb-10 pt-14 sm:pt-16">
          <h1 className="max-w-2xl text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
            Cherchez un prof, une matière, ou parcourez ce qui se donne en ce
            moment.
          </h1>

          <form action="/courses" method="get" className="relative mt-6 max-w-xl">
            <div className="flex items-stretch rounded-md border border-border bg-card">
              <div className="flex items-center pl-4">
                <Search className="h-4 w-4 text-muted-foreground" />
              </div>

              <Input
                name="q"
                value={professorQuery}
                onChange={(event) => setProfessorQuery(event.target.value)}
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

      {/* The board */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-5xl px-6 py-10">
          {board.map((course) => (
            <Link
              key={course.id}
              href={`/courses/${course.id}`}
              className="grid grid-cols-[3px_1fr_auto] items-center gap-4 border-b border-border py-4 transition-colors last:border-b-0 hover:bg-muted/50 sm:grid-cols-[3px_1fr_auto_auto_auto] sm:gap-6 sm:px-3"
            >
              <span className={`h-10 w-[3px] rounded-full ${accentBar[course.accent as Accent]}`} />

              <span className="min-w-0">
                <span className="flex flex-wrap items-baseline gap-x-2">
                  <span className="font-medium">{course.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {course.nextChapter}
                  </span>
                </span>
                <span className="mt-0.5 block text-sm text-muted-foreground">
                  {course.prof} · {course.role}
                </span>
              </span>

              <span className="hidden shrink-0 text-sm text-muted-foreground sm:block">
                {course.level}
              </span>

              <span className="hidden shrink-0 items-center gap-1 text-sm text-muted-foreground sm:flex">
                <Clock3 className="h-3.5 w-3.5" />
                {course.duration}
              </span>

              <span className="flex shrink-0 items-center gap-1 text-sm font-medium">
                <Star className="h-3.5 w-3.5 fill-current" />
                {course.rating}
              </span>
            </Link>
          ))}

          <div className="pt-6">
            <Link
              href="/courses"
              className="flex items-center gap-1 text-sm font-medium text-primary"
            >
              Voir tout le catalogue
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* For teachers */}
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

      {/* Final CTA */}
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
              <Link href="/devenir-professeur">Devenir professeur</Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}