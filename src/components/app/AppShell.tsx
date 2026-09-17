// components/app/AppShell.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  ChevronRight,
  FolderTree,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Settings,
  ShieldCheck,
  Sun,
  Users,
  UserCheck,
  X,
} from "lucide-react";
import { useState } from "react";
import { signOut } from "next-auth/react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";

const adminLinks = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/bac-access-requests", label: "Access requests", icon: ShieldCheck },
  { href: "/admin/professor-applications", label: "Professor applications", icon: UserCheck },
  { href: "/admin/categories", label: "Categories", icon: FolderTree },
];

const workspaceLinks = [
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/courses", label: "Courses", icon: BookOpen },
  { href: "/students", label: "Students", icon: Users },
  { href: "/settings/profile", label: "Settings", icon: Settings },
];

function WorkspaceNavigation({
  links,
  pathname,
  onNavigate,
}: {
  links: typeof adminLinks;
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="grid gap-1">
      {links.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || (href !== "/admin" && pathname.startsWith(`${href}/`));
        return (
          <Link
            key={href}
            href={href}
            {...(onNavigate ? { onClick: onNavigate } : {})}
            className={`group flex items-center gap-3 px-3 py-2.5 text-sm transition-colors ${
              active
                ? "bg-primary/10 font-medium text-primary"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            }`}
          >
            <Icon className="size-4 shrink-0" />
            <span>{label}</span>
            {active && <ChevronRight className="ml-auto size-3.5" />}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({ children, user }: {
  children: React.ReactNode;
  user?: {
    name?: string | null;
    email?: string | null;
    roles?: string[];
  };
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();
  const isAdmin = user?.roles?.includes("admin") === true;
  const links = isAdmin ? adminLinks : workspaceLinks;
  const isDark = resolvedTheme === "dark";

  return (
    <div className="flex min-h-svh w-full bg-background text-foreground">
      <aside className="relative hidden w-64 shrink-0 bg-muted/20 px-4 py-7 lg:block">
        <div className="px-3">
          <Link href="/" className="text-xl font-semibold tracking-tight">
            Curio<span className="text-primary">.</span>
          </Link>
          <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            {isAdmin ? "Administration" : "Workspace"}
          </p>
        </div>
        <div className="mt-10">
          <WorkspaceNavigation links={links} pathname={pathname} />
        </div>
        <div className="absolute bottom-0 left-0 flex w-64 flex-col gap-1 px-4 pb-5">
          <div className="px-3 pb-2 text-xs text-muted-foreground">
            <p className="truncate font-medium text-foreground">{user?.name ?? "Workspace user"}</p>
            <p className="mt-0.5 truncate">{user?.email ?? ""}</p>
          </div>
          <button
            type="button"
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className="flex items-center gap-3 px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
          >
            {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
            {isDark ? "Light appearance" : "Dark appearance"}
          </button>
          <button
            type="button"
            onClick={() => void signOut({ callbackUrl: "/" })}
            className="flex items-center gap-3 px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="size-4" />
            Sign out
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <div className="flex h-14 items-center justify-between px-5 lg:hidden">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            Curio<span className="text-primary">.</span>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            aria-label={mobileOpen ? "Close workspace navigation" : "Open workspace navigation"}
            onClick={() => setMobileOpen((open) => !open)}
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </Button>
        </div>

        {mobileOpen && (
          <div className="px-5 pb-5 lg:hidden">
            <div className="bg-muted/30 p-2 shadow-sm">
              <WorkspaceNavigation
                links={links}
                pathname={pathname}
                onNavigate={() => setMobileOpen(false)}
              />
              <div className="mt-3 border-t border-border/60 pt-3">
                <p className="px-3 text-xs text-muted-foreground">{user?.email ?? "Workspace"}</p>
                <button
                  type="button"
                  onClick={() => setTheme(isDark ? "light" : "dark")}
                  className="mt-2 flex w-full items-center gap-3 px-3 py-2.5 text-sm text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                >
                  {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
                  {isDark ? "Light appearance" : "Dark appearance"}
                </button>
                <button
                  type="button"
                  onClick={() => void signOut({ callbackUrl: "/" })}
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  <LogOut className="size-4" />
                  Sign out
                </button>
              </div>
            </div>
          </div>
        )}

        <main className="min-w-0 px-5 py-6 sm:px-8 lg:px-10">{children}</main>
      </div>
    </div>
  );
}
