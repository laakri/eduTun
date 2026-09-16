"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, PenLine, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

// ---------------------------------------------------------------------------
// Content
// ---------------------------------------------------------------------------
// NOTE: image URLs are Unsplash placeholders for prototyping — replace with
// your own licensed photography before shipping.

const bacSubjects = [
  { slug: "subject-mathematiques", name: "Mathématiques", code: "MATH" },
  { slug: "subject-physique", name: "Physique", code: "PHYS" },
  { slug: "subject-chimie", name: "Chimie", code: "CHIM" },
  { slug: "subject-sciences-vie-terre", name: "Sciences de la vie et de la Terre", code: "SVT" },
  { slug: "subject-informatique", name: "Informatique", code: "INFO" },
  { slug: "subject-algorithmique", name: "Algorithmique", code: "ALGO" },
  { slug: "subject-francais", name: "Français", code: "FR" },
  { slug: "subject-anglais", name: "Anglais", code: "ANG" },
  { slug: "subject-arabe", name: "Arabe", code: "AR" },
  { slug: "subject-histoire", name: "Histoire", code: "HIST" },
  { slug: "subject-geographie", name: "Géographie", code: "GÉO" },
  { slug: "subject-philosophie", name: "Philosophie", code: "PHILO" },
] as const;

const quickLinks = bacSubjects.slice(0, 4).map((subject) => ({
  label: subject.name,
  href: `/courses?category=${encodeURIComponent(subject.name)}`,
}));

const featuredCourses = [
  {
    slug: "derivees-et-primitives",
    title: "Dérivées et primitives",
    professor: "Sami Bouzid",
    subjectCode: "MATH",
    image:
      "https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=800&q=70",
  },
  {
    slug: "lois-de-newton",
    title: "Les lois de Newton",
    professor: "Ines Chaouch",
    subjectCode: "PHYS",
    image:
      "https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?auto=format&fit=crop&w=800&q=70",
  },
  {
    slug: "reactions-acido-basiques",
    title: "Réactions acido-basiques",
    professor: "Yassine Trabelsi",
    subjectCode: "CHIM",
    image:
      "https://images.unsplash.com/photo-1554475901-4538ddfbccc2?auto=format&fit=crop&w=800&q=70",
  },
  {
    slug: "respiration-cellulaire",
    title: "La respiration cellulaire",
    professor: "Nour Gharbi",
    subjectCode: "SVT",
    image:
      "https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=800&q=70",
  },
  {
    slug: "structures-de-donnees",
    title: "Structures de données",
    professor: "Karim Feki",
    subjectCode: "INFO",
    image:
      "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=800&q=70",
  },
  {
    slug: "le-romantisme-francais",
    title: "Le romantisme français",
    professor: "Amel Jendoubi",
    subjectCode: "FR",
    image:
      "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=800&q=70",
  },
  {
    slug: "essay-writing-techniques",
    title: "Essay writing techniques",
    professor: "Mariem Ayari",
    subjectCode: "ANG",
    image:
      "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?auto=format&fit=crop&w=800&q=70",
  },
  {
    slug: "la-tunisie-precoloniale",
    title: "La Tunisie précoloniale",
    professor: "Walid Mejri",
    subjectCode: "HIST",
    image:
      "https://images.unsplash.com/photo-1461360370896-922624d12aa1?auto=format&fit=crop&w=800&q=70",
  },
] as const;

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function HomePage() {
  const [professorQuery, setProfessorQuery] = useState("");

  type Professor = {
    id: string;
    fullName: string;
    courseCount: number;
  };

  const [professors, setProfessors] = useState<Professor[]>([]);

  useEffect(() => {
    const query = professorQuery.trim();

    if (query.length < 2) {
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
      {/* Hero                                                             */}
      {/* ----------------------------------------------------------------- */}

      <section className="relative overflow-hidden border-b border-border">
        <img
          src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1600&q=70"
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-black/70" />

        <div className="relative mx-auto max-w-5xl px-6 pb-10 pt-14 sm:pt-16">
          <h1 className="max-w-2xl text-3xl font-semibold leading-tight tracking-tight text-white sm:text-4xl">
            Cherchez un prof, une matière, ou parcourez ce qui se donne en ce
            moment.
          </h1>

          <form
            action="/courses"
            method="get"
            className="relative mt-6 max-w-xl"
          >
            <div className="flex items-stretch rounded-md border border-white/30 bg-white/95">
              <div className="flex items-center pl-4">
                <Search className="h-4 w-4 text-muted-foreground" />
              </div>

              <Input
                name="q"
                value={professorQuery}
                onChange={(event) => setProfessorQuery(event.target.value)}
                placeholder="Rechercher un professeur ou une matière..."
                className="h-12 border-0 bg-transparent pl-3 text-foreground shadow-none focus-visible:ring-0"
              />

              <Button type="submit" size="lg" className="m-1">
                Rechercher
                <ArrowRight className="ml-1.5 h-4 w-4" />
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

          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/80">
            {quickLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="transition-colors hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* Featured courses carousel                                       */}
      {/* ----------------------------------------------------------------- */}

      <section className="border-b border-border">
        <div className="mx-auto max-w-5xl px-6 py-14 sm:py-16">
          <Carousel opts={{ align: "start" }} className="w-full">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                  Cours à la une
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Une sélection de chapitres suivis cette semaine.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <CarouselPrevious className="static h-9 w-9 translate-x-0 translate-y-0">
                  <ChevronLeft className="h-4 w-4" />
                </CarouselPrevious>
                <CarouselNext className="static h-9 w-9 translate-x-0 translate-y-0">
                  <ChevronRight className="h-4 w-4" />
                </CarouselNext>
              </div>
            </div>

            <CarouselContent className="-ml-4">
              {featuredCourses.map((course) => (
                <CarouselItem
                  key={course.slug}
                  className="basis-[78%] pl-4 sm:basis-1/2 lg:basis-1/3"
                >
                  <Link href={`/courses/${course.slug}`} className="group block">
                    <div className="relative aspect-[4/5] overflow-hidden rounded-md border border-border">
                      <img
                        src={course.image}
                        alt=""
                        loading="lazy"
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                      />

                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-black/0" />

                      <span className="absolute left-4 top-4 rounded-sm bg-black/50 px-2 py-1 font-mono text-xs text-white backdrop-blur-sm">
                        {course.subjectCode}
                      </span>

                      <div className="absolute inset-x-0 bottom-0 p-4">
                        <h3 className="text-[15px] font-medium leading-snug text-white">
                          {course.title}
                        </h3>
                        <p className="mt-1 text-xs text-white/70">
                          {course.professor}
                        </p>
                      </div>
                    </div>
                  </Link>
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
        </div>
      </section>

   

 
   {/* ----------------------------------------------------------------- */}
      {/* Tunisian Baccalaureate subjects                                  */}
      {/* ----------------------------------------------------------------- */}

      <section className="border-b border-border">
        <div className="mx-auto max-w-5xl px-6 py-14 sm:py-16">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Le programme du Bac, matière par matière
              </h2>

              <p className="mt-2 text-sm text-muted-foreground">
                Chaque matière porte son code officiel. Cliquez pour voir les
                cours.
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

          <div className="grid sm:grid-cols-2">
            {bacSubjects.map((subject) => (
              <Link
                key={subject.slug}
                href={`/courses?category=${encodeURIComponent(subject.name)}`}
                className="group relative flex items-center gap-4 border-b border-border py-4 pr-2 sm:odd:border-r sm:odd:pr-6 sm:even:pl-6"
              >
                <span className="absolute inset-y-0 left-0 w-0.5 origin-top scale-y-0 bg-primary transition-transform duration-200 group-hover:scale-y-100" />

                <span className="w-12 shrink-0 font-mono text-xs text-muted-foreground">
                  {subject.code}
                </span>

                <span className="flex-1 text-[15px] font-medium">
                  {subject.name}
                </span>

                <ArrowRight className="h-4 w-4 -translate-x-1 shrink-0 text-muted-foreground opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:text-primary group-hover:opacity-100" />
              </Link>
            ))}
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
              <Link href="/devenir-professeur">Devenir professeur</Link>
            </Button>
          </div>
        </div>
      </section>
                 {/* ----------------------------------------------------------------- */}
      {/* For teachers                                                     */}
      {/* ----------------------------------------------------------------- */}

      <section className="relative overflow-hidden border-b border-border bg-foreground text-background">
        <img
          src="https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=1600&q=70"
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-25"
        />

        <div className="relative mx-auto grid max-w-5xl gap-10 px-6 py-16 sm:py-20 lg:grid-cols-[1fr_auto] lg:items-center">
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
      {/* Footer */}
<footer className="border-t border-border bg-background">
  <div className="mx-auto max-w-5xl px-6 py-12">
    <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
      {/* Brand */}
      <div className="lg:col-span-2">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Curio
        </Link>

        <p className="mt-3 max-w-sm text-sm leading-6 text-muted-foreground">
          Une plateforme pour apprendre, partager ses connaissances et
          progresser avec les bons professeurs.
        </p>
      </div>

      {/* Learn */}
      <div>
        <h3 className="text-sm font-medium">Apprendre</h3>

        <div className="mt-4 flex flex-col gap-3">
          <Link
            href="/courses"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Tous les cours
          </Link>

          <Link
            href="/courses?category=Mathématiques"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Mathématiques
          </Link>

          <Link
            href="/courses?category=Physique"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Physique
          </Link>

          <Link
            href="/courses?category=Informatique"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Informatique
          </Link>
        </div>
      </div>

      {/* Teach */}
      <div>
        <h3 className="text-sm font-medium">Enseigner</h3>

        <div className="mt-4 flex flex-col gap-3">
          <Link
            href="/devenir-professeur"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Devenir professeur
          </Link>

          <Link
            href="/professors"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Nos professeurs
          </Link>
        </div>
      </div>
    </div>

    <div className="mt-12 flex flex-col gap-4 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-muted-foreground">
        © {new Date().getFullYear()} Curio. Tous droits réservés.
      </p>

      <div className="flex gap-5">
        <Link
          href="/privacy"
          className="text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          Confidentialité
        </Link>

        <Link
          href="/terms"
          className="text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          Conditions
        </Link>

        <Link
          href="/contact"
          className="text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          Contact
        </Link>
      </div>
    </div>
  </div>
</footer>
    </main>
  );
}