import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  BookOpen,
  Calculator,
  Command,
  FlaskConical,
  Globe2,
  Languages,
  Lock,
  Search,
  ShieldCheck,
  Sigma,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

// Narrow "shell" width used everywhere instead of the usual wide container.
const SHELL = "mx-auto w-full max-w-5xl px-6";

const NAV = [
  "Home",
  "Courses",
  "Exams",
  "Rankings",
  "Tracks",
  "Teachers",
  "Pricing",
  "Docs",
];

const STATS = [
  { value: "12+", label: "Subjects" },
  { value: "48K+", label: "Students" },
  { value: "80+", label: "Teachers" },
  { value: "3,200+", label: "Past exams" },
];

const COURSES = [
  {
    icon: Sigma,
    name: "Mathématiques",
    tag: "New",
    by: "Section Sciences Exp",
    lessons: "184",
    trend: "+14%",
  },
  {
    icon: FlaskConical,
    name: "Physique-Chimie",
    by: "Section Sciences Exp",
    lessons: "156",
    trend: "+9%",
  },
  {
    icon: Languages,
    name: "Philosophie",
    tag: "New",
    by: "Section Lettres",
    lessons: "92",
    trend: "--",
  },
];

const TRACKS = [
  {
    title: "SCIENCES-EXP",
    name: "Track Sciences Expérimentales",
    tagline: "A full-year path that adapts to your weakest chapters",
    icon: FlaskConical,
  },
  {
    title: "MATH+",
    name: "Track Mathématiques",
    tagline: "Depth-first prep for engineering-school hopefuls",
    icon: Calculator,
  },
  {
    title: "LETTRES",
    name: "Track Lettres",
    tagline: "Essays corrected by former Bac examiners",
    icon: BookOpen,
  },
];

const STEPS = [
  {
    n: "1",
    title: "Signup",
    description:
      "Create an account to get started. You can join a class group later.",
  },
  {
    n: "2",
    title: "Pick your track",
    description: "Courses can be mixed and matched across any section.",
  },
  {
    n: "3",
    title: "Start practicing",
    description: "Work past exams and get corrections within 48 hours.",
  },
];

const POSTS = [
  {
    title: "2026 Physics-Chemistry Corrections Are Live",
    description:
      "Full worked solutions for the June session paper, including the bonus exercise most students missed.",
    date: "Sep 2, 2026",
    isNew: true,
    image: "https://picsum.photos/seed/edutun-post-physics/200/200",
  },
  {
    title: "Bac Blanc Schedule For October",
    description:
      "Mock exam dates for every section, with a live review session the following week.",
    date: "Aug 28, 2026",
    isNew: true,
    image: "https://picsum.photos/seed/edutun-post-schedule/200/200",
  },
  {
    title: "How Bac Grading Actually Works",
    description:
      "A breakdown of coefficients by section, and why your Math grade matters more than you think.",
    date: "Aug 20, 2026",
    image: "https://picsum.photos/seed/edutun-post-grading/200/200",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      <main>
        {/* Hero */}
        <section className="pb-16 pt-20 text-center sm:pt-28">
          <div className={SHELL}>
            <h1 className="text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
              The Complete Platform
              <br />
              For Every Bac Section
            </h1>

            <p className="mx-auto mt-6 max-w-lg text-muted-foreground">
              Better courses,{" "}
              <span className="text-foreground underline underline-offset-4">
                better corrections
              </span>
              , no wasted study time.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/register">
                <Button
                  size="lg"
                  className="w-full bg-lime-400 font-semibold text-black hover:bg-lime-300 sm:w-auto"
                >
                  Get Started
                </Button>
              </Link>
              <Link href="/packs">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full gap-2 border-border bg-transparent text-foreground hover:bg-accent sm:w-auto"
                >
                  Explore packs <Sparkles className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="pb-16">
          <div
            className={`${SHELL} grid grid-cols-2 gap-8 sm:grid-cols-4 sm:gap-4`}
          >
            {STATS.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl font-extrabold sm:text-4xl">
                  {stat.value}
                </div>
                <div className="mt-1 text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* 4 feature cards */}
        {/* 4 feature cards */}
        <section className="pb-24">
          <div className={`${SHELL} grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4`}>

            {/* CARD TEMPLATE STYLE NOTE:
        ALL cards use:
        - fixed top area (h-20)
        - same padding rhythm
        - consistent visual anchor
    */}

            {/* CARD 1 */}
            <div className="rounded-xl border border-border bg-muted/50 p-5 flex flex-col h-full">

              {/* TOP (fixed height frame) */}
              <div className="h-20 flex items-center justify-center">
                <div className="grid grid-cols-4 gap-2">
                  {[Sigma, FlaskConical, Languages, Globe2, Calculator, BookOpen, Users, Sparkles].map(
                    (Icon, i) => (
                      <div
                        key={i}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground"
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* MIDDLE */}
              <div className="mt-4">
                <h3 className="font-semibold">All Subjects, One Place</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Generate a full study plan across every subject in one unified dashboard.
                </p>
              </div>

              {/* BOTTOM */}
              <div className="mt-auto pt-5">
                <Link href="/courses" className="text-sm underline underline-offset-4">
                  Browse all
                </Link>
              </div>
            </div>

            {/* CARD 2 */}
            <div className="rounded-xl border border-border bg-muted/50 p-5 flex flex-col h-full">

              {/* TOP (same height frame) */}
              <div className="h-20 flex items-center justify-center">

                <div className="flex flex-col items-center gap-2">

                  <div className="rounded-md border border-border bg-background px-3 py-1 text-xs text-muted-foreground">
                    edutun/mathematiques-t
                  </div>

                  <div className="flex items-center gap-4">
                    <Users className="h-4 w-4" />
                    <BookOpen className="h-4 w-4 text-lime-500" />
                    <BadgeCheck className="h-4 w-4" />
                  </div>

                </div>

              </div>

              {/* MIDDLE */}
              <div className="mt-4">
                <h3 className="font-semibold">Never Miss a Lesson</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Recorded lessons fall back for you when your teacher isn't available.
                </p>
              </div>

              {/* BOTTOM */}
              <div className="mt-auto pt-5">
                <Link href="/tracks" className="text-sm underline underline-offset-4">
                  Learn more
                </Link>
              </div>
            </div>

            {/* CARD 3 */}
            <div className="rounded-xl border border-border bg-muted/50 p-5 flex flex-col h-full">

              {/* TOP (same height frame) */}
              <div className="h-20 flex items-center justify-center">
                <div className="w-full rounded-lg border border-border bg-background p-3">
                  <div className="mb-2 flex justify-between text-[10px] text-muted-foreground">
                    <span>Average</span>
                    <span>+3.4 pts</span>
                  </div>
                  <svg viewBox="0 0 200 60" className="h-10 w-full">
                    <polyline
                      fill="none"
                      stroke="#a3e635"
                      strokeWidth="2"
                      points="0,50 30,45 60,48 90,30 120,34 150,15 180,20 200,8"
                    />
                  </svg>
                </div>
              </div>

              {/* MIDDLE */}
              <div className="mt-4">
                <h3 className="font-semibold">Track Your Progress</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  See grade trends by subject so you know what to fix first.
                </p>
              </div>

              {/* BOTTOM */}
              <div className="mt-auto pt-5">
                <Link href="/rankings" className="text-sm underline underline-offset-4">
                  Learn more
                </Link>
              </div>
            </div>

            {/* CARD 4 */}
            <div className="rounded-xl border border-border bg-muted/50 p-5 flex flex-col h-full">

              {/* TOP (same height frame) */}
              <div className="h-20 flex items-center justify-center gap-3">
                <Lock className="h-4 w-4 text-muted-foreground" />
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <ShieldCheck className="h-6 w-6 text-lime-500" />
                </div>
                <Lock className="h-4 w-4 text-muted-foreground" />
              </div>

              {/* MIDDLE */}
              <div className="mt-4">
                <h3 className="font-semibold">Corrected By Teachers</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Every practice exam is reviewed by a subject teacher, not an answer key.
                </p>
              </div>

              {/* BOTTOM */}
              <div className="mt-auto pt-5">
                <Link href="/teachers" className="text-sm underline underline-offset-4">
                  View teachers
                </Link>
              </div>
            </div>

          </div>
        </section>

        {/* Featured Courses */}
        <section className="pb-20">
          <div className={SHELL}>
            <div className="mb-6 flex items-end justify-between">
              <div>
                <h2 className="text-xl font-semibold">Featured Courses</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  3,200+ past exams across 12+ subjects
                </p>
              </div>
              <Link
                href="/courses"
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
              >
                View all <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {COURSES.map((course) => (
                <div
                  key={course.name}
                  className="rounded-xl border border-border bg-muted/50 p-5"
                >
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
                      <course.icon className="h-4 w-4" />
                    </div>
                    <span className="font-medium">{course.name}</span>
                    {course.tag && (
                      <Badge className="bg-lime-400/20 text-lime-700 dark:text-lime-300 hover:bg-lime-400/20">
                        {course.tag}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">by {course.by}</p>

                  <Separator className="my-4 bg-muted" />

                  <div className="flex justify-between text-sm">
                    <div>
                      <div className="text-muted-foreground">Lessons</div>
                      <div className="font-medium">{course.lessons}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-muted-foreground">Weekly Progress</div>
                      <div
                        className={
                          course.trend !== "--"
                            ? "font-medium text-lime-700 dark:text-lime-400"
                            : "font-medium text-muted-foreground"
                        }
                      >
                        {course.trend}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Featured Tracks (agents equivalent) */}
        <section className="pb-20">
          <div className={SHELL}>
            <div className="mb-6 flex items-end justify-between">
              <div>
                <h2 className="text-xl font-semibold">Featured Tracks</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  48K+ students learning across every section
                </p>
              </div>
              <Link
                href="/tracks"
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
              >
                View all <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {TRACKS.map((track) => (
                <div
                  key={track.name}
                  className="overflow-hidden rounded-xl border border-border bg-muted/50"
                >
                  <div className="flex h-32 items-center justify-center bg-gradient-to-br from-muted to-transparent">
                    <span className="font-mono text-lg font-bold tracking-wider text-lime-700 dark:text-lime-300">
                      {track.title}
                    </span>
                  </div>
                  <div className="flex items-start gap-3 p-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
                      <track.icon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-medium">{track.name}</div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {track.tagline}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Steps */}
        <section className="pb-24">
          <div className={`${SHELL} grid grid-cols-1 gap-10 sm:grid-cols-3`}>
            {STEPS.map((step) => (
              <div key={step.n}>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full border border-border text-xs text-foreground">
                    {step.n}
                  </span>
                  {step.title}
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  {step.description}
                </p>
                <div className="mt-4 flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
                  <div className="h-1.5 flex-1 rounded-full bg-muted">
                    <div
                      className="h-1.5 rounded-full bg-lime-400"
                      style={{ width: `${Number(step.n) * 33}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Recent posts */}
        <section className="pb-24">
          <div className={SHELL}>
            <div className="mb-6 flex items-end justify-between">
              <h2 className="text-xl font-semibold">Recent Updates</h2>
              <Link
                href="/blog"
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
              >
                View all <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="divide-y divide-border border-y border-border">
              {POSTS.map((post) => (
                <div
                  key={post.title}
                  className="flex flex-col gap-4 py-5 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="flex flex-1 gap-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={post.image}
                      alt=""
                      className="h-16 w-16 shrink-0 rounded-lg object-cover sm:h-20 sm:w-20"
                    />
                    <div className="sm:max-w-lg">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{post.title}</h3>
                        {post.isNew && (
                          <Badge className="bg-lime-400/20 text-lime-700 dark:text-lime-300 hover:bg-lime-400/20">
                            New
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {post.description}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm text-muted-foreground">{post.date}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-14">
        <div className={`${SHELL} grid grid-cols-2 gap-8 sm:grid-cols-4 md:grid-cols-5`}>
          <div className="col-span-2 sm:col-span-4 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-lime-400 text-black">
                <BookOpen className="h-3.5 w-3.5" />
              </div>
              edutun
            </Link>
            <p className="mt-3 text-sm text-muted-foreground">
              © 2026 EduTun, Inc.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-medium text-foreground">Product</h4>
            <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
              <li><Link href="/courses" className="hover:text-foreground">Courses</Link></li>
              <li><Link href="/rankings" className="hover:text-foreground">Rankings</Link></li>
              <li><Link href="/exams" className="hover:text-foreground">Past exams</Link></li>
              <li><Link href="/pricing" className="hover:text-foreground">Pricing</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-medium text-foreground">Company</h4>
            <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
              <li><Link href="/about" className="hover:text-foreground">About</Link></li>
              <li><Link href="/blog" className="hover:text-foreground">Blog</Link></li>
              <li><Link href="/careers" className="hover:text-foreground">Careers</Link></li>
              <li><Link href="/contact" className="hover:text-foreground">Contact</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-medium text-foreground">Support</h4>
            <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
              <li><Link href="/help" className="hover:text-foreground">Help center</Link></li>
              <li><Link href="/teachers" className="hover:text-foreground">For teachers</Link></li>
              <li><Link href="/terms" className="hover:text-foreground">Terms</Link></li>
              <li><Link href="/privacy" className="hover:text-foreground">Privacy</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-medium text-foreground">Connect</h4>
            <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
              <li><Link href="#" className="hover:text-foreground">Discord</Link></li>
              <li><Link href="#" className="hover:text-foreground">Instagram</Link></li>
              <li><Link href="#" className="hover:text-foreground">Facebook</Link></li>
              <li><Link href="#" className="hover:text-foreground">YouTube</Link></li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
}
