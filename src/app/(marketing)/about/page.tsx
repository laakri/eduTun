import Link from "next/link";
import { GraduationCap, Users, BookOpen, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";

const STATS = [
  { value: "120+", label: "Courses published" },
  { value: "40+", label: "Professors teaching" },
  { value: "8,500+", label: "Students learning" },
  { value: "94%", label: "Exam pass rate" },
];

const VALUES = [
  {
    icon: BookOpen,
    title: "Built around real courses",
    description:
      "Every course on EduTun is written by someone who teaches the subject, not repackaged from a textbook.",
  },
  {
    icon: Users,
    title: "Professors keep control",
    description:
      "Professors set their own curriculum, pacing, and pricing. We handle the platform, not the pedagogy.",
  },
  {
    icon: ShieldCheck,
    title: "Exams that mean something",
    description:
      "Our test platform mirrors real exam conditions, so the score you get is one you can trust.",
  },
  {
    icon: GraduationCap,
    title: "Progress you can see",
    description:
      "Students track chapters, scores, and time studied in one place, without digging through folders.",
  },
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:py-24">
      {/* HERO */}
      <div className="max-w-2xl">
        <p className="text-sm font-medium text-primary">About EduTun</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          A learning platform built with the professors who teach on it.
        </h1>
        <p className="mt-5 text-base leading-relaxed text-muted-foreground">
          EduTun started from a simple frustration: good courses were scattered across PDFs,
          group chats, and photocopied notes. We built a single place where professors publish
          real courses and students can study, practice, and test themselves against real exam
          conditions.
        </p>
      </div>

      {/* STATS */}
      <div className="mt-14 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-muted bg-muted sm:grid-cols-4">
        {STATS.map((stat) => (
          <div key={stat.label} className="bg-background px-5 py-6">
            <div className="text-2xl font-semibold text-foreground">{stat.value}</div>
            <div className="mt-1 text-sm text-muted-foreground">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* VALUES */}
      <div className="mt-20">
        <h2 className="text-xl font-semibold text-foreground">What we care about</h2>
        <div className="mt-8 grid gap-8 sm:grid-cols-2">
          {VALUES.map(({ icon: Icon, title, description }) => (
            <div key={title} className="flex gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-muted text-foreground">
                <Icon className="h-4.5 w-4.5" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-foreground">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="mt-20 flex flex-col items-start gap-5 rounded-lg border border-muted px-6 py-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Want to teach on EduTun?</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Publish your first course and reach students looking for exactly what you teach.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Link href="/apply/professor">
            <Button size="sm">Become a professor</Button>
          </Link>
          <Link href="/contact">
            <Button size="sm" variant="outline">
              Contact us
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}