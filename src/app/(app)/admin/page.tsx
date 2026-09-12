import Link from "next/link";
import { ArrowRight, BookOpenCheck, FolderTree, UserCheck } from "lucide-react";

import { requireRole } from "@/core/auth.service";
import { Card } from "@/components/ui/card";

const adminSections = [
  {
    title: "Bac access requests",
    description: "Review learner Bac selections and approve or reject access.",
    href: "/admin/bac-access-requests",
    icon: BookOpenCheck,
  },
  {
    title: "Professor applications",
    description: "Review applications and grant the professor role after approval.",
    href: "/admin/professor-applications",
    icon: UserCheck,
  },
  {
    title: "Categories",
    description: "Manage the Bac and course category tree.",
    href: "/admin/categories",
    icon: FolderTree,
  },
];

export default async function AdminPage() {
  await requireRole("admin");

  return (
    <main className="mx-auto max-w-5xl">
      <p className="text-sm font-medium text-primary">Administration</p>
      <h1 className="mt-1 text-2xl font-bold tracking-tight">Admin workspace</h1>
      <p className="mt-2 text-sm text-muted-foreground">Review access, professor applications, and the learning taxonomy.</p>

      <div className="mt-8 grid gap-3 md:grid-cols-3">
        {adminSections.map(({ title, description, href, icon: Icon }) => (
          <Link key={href} href={href}>
            <Card className="group h-full p-5 transition-colors hover:border-primary/40 hover:bg-muted/20">
              <Icon className="size-5 text-primary" />
              <h2 className="mt-5 text-sm font-semibold">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
              <span className="mt-5 inline-flex items-center gap-1 text-xs font-medium text-primary">Open <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" /></span>
            </Card>
          </Link>
        ))}
      </div>
    </main>
  );
}
