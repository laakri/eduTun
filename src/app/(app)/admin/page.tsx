import Link from "next/link";
import { Activity, ArrowUpRight, Clock3, ShieldCheck, UserCheck } from "lucide-react";

import { requireRole } from "@/core/auth.service";

export default async function AdminPage() {
  await requireRole("admin");

  return (
    <main className="mx-auto w-full max-w-7xl">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-medium text-primary">Control center</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Admin workspace</h1>
          <p className="mt-2 text-sm text-muted-foreground">Keep access, people, and the learning system moving.</p>
        </div>
        <span className="text-xs text-muted-foreground">Curio administration</span>
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="min-w-0">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold">Today</h2>
              <p className="mt-1 text-sm text-muted-foreground">Your review queue is ready in the sidebar.</p>
            </div>
            <Activity className="size-4 text-muted-foreground" />
          </div>
          <div className="mt-5 divide-y divide-border/60 bg-muted/20">
            <Link href="/admin/bac-access-requests" className="group flex items-center justify-between gap-4 px-4 py-4 transition-colors hover:bg-muted/50">
              <div className="flex items-center gap-3">
                <ShieldCheck className="size-4 text-primary" />
                <div>
                  <p className="text-sm font-medium">Bac access requests</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">Review learner access decisions</p>
                </div>
              </div>
              <ArrowUpRight className="size-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Link>
            <Link href="/admin/professor-applications" className="group flex items-center justify-between gap-4 px-4 py-4 transition-colors hover:bg-muted/50">
              <div className="flex items-center gap-3">
                <UserCheck className="size-4 text-primary" />
                <div>
                  <p className="text-sm font-medium">Professor applications</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">Review people joining Curio</p>
                </div>
              </div>
              <ArrowUpRight className="size-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Link>
          </div>
        </section>

        <aside className="bg-muted/20 p-5">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Clock3 className="size-4 text-primary" />
            Admin rhythm
          </div>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Keep pending access and professor reviews moving. The sidebar is your command line for the workspace.
          </p>
          <Link href="/admin/categories" className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
            Manage categories <ArrowUpRight className="size-3.5" />
          </Link>
        </aside>
      </div>
    </main>
  );
}
