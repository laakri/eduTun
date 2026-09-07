// components/app/AppShell.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  LayoutDashboard,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
  Users,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";

type Page = { label: string; href: string; children?: Page[]; adminOnly?: boolean };
type Section = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  pages: Page[];
};

const sections: Section[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    pages: [
      { label: "Overview", href: "/dashboard" },
      { label: "Activity", href: "/dashboard/activity" },
    ],
  },
  {
    label: "Courses",
    href: "/courses",
    icon: BookOpen,
    pages: [
      { label: "Overview", href: "/courses" },
      { label: "All courses", href: "/courses/all" },
      {
        label: "Categories",
        href: "/courses/categories",
        children: [
          { label: "Baccalauréat", href: "/courses/categories/bac" },
          { label: "Languages", href: "/courses/categories/languages" },
        ],
      },
      { label: "New course", href: "/courses/new" },
      { label: "Professor applications", href: "/admin/professor-applications", adminOnly: true },
    ],
  },
  {
    label: "Students",
    href: "/students",
    icon: Users,
    pages: [
      { label: "Overview", href: "/students" },
      { label: "Enrollment", href: "/students/enrollment" },
    ],
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
    pages: [
      { label: "General", href: "/settings" },
      { label: "Billing", href: "/settings/billing" },
    ],
  },
];

function Mark() {
  return (
    <svg viewBox="0 0 32 32" className="size-4 shrink-0 text-sidebar-primary" fill="none">
      <path
        d="M16 8 C11 5 6 5 3 7 V24 C6 22 11 22 16 25 C21 22 26 22 29 24 V7 C26 5 21 5 16 8 Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M16 8 V25" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function AppShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user?: {
    name?: string | null;
    email?: string | null;
    roles?: string[];
  };
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const activeSection = (() => {
    const found = sections.find((s) => pathname?.startsWith(s.href));
    return found ?? sections[0]!;
  })();

  const initials = (user?.name ?? user?.email ?? "?").trim().charAt(0).toUpperCase();

  function SidebarPages({ collapsed }: { collapsed: boolean }) {
    return (
      <div className="flex flex-1 flex-col gap-0.5">
        {!collapsed && (
          <div className="mb-3 flex items-center gap-2 px-2.5 text-[13px] font-medium text-sidebar-foreground">
            <activeSection.icon className="size-[15px]" />
            {activeSection.label}
          </div>
        )}

        {activeSection.pages.filter((page) => !page.adminOnly || user?.roles?.includes("admin")).map((page) => {
          const active = pathname === page.href;
          const isOpen = expanded === page.href;

          if (page.children) {
            if (collapsed) return null; // nested groups need labels, skip in rail mode
            return (
              <div key={page.href}>
                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? null : page.href)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-sm px-2.5 py-[7px] text-[13px] transition-colors hover:bg-sidebar-accent",
                    isOpen ? "text-sidebar-foreground" : "text-sidebar-foreground/60",
                  )}
                >
                  {page.label}
                  {isOpen ? (
                    <ChevronDown className="size-3.5" />
                  ) : (
                    <ChevronRight className="size-3.5" />
                  )}
                </button>

                {isOpen && (
                  <div className="ml-2.5 flex flex-col gap-0.5 border-l border-sidebar-border pl-2.5">
                    {page.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                          "rounded-sm px-2 py-[6px] text-[13px] transition-colors hover:bg-sidebar-accent",
                          pathname === child.href
                            ? "text-sidebar-primary"
                            : "text-sidebar-foreground/60",
                        )}
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          const Icon = activeSection.icon;

          return (
            <Link
              key={page.href}
              href={page.href}
              onClick={() => setMobileOpen(false)}
              title={collapsed ? page.label : undefined}
              className={cn(
                "flex items-center gap-2.5 rounded-sm px-2.5 py-[7px] text-[13px] transition-colors",
                collapsed && "justify-center px-0",
                active
                  ? "bg-sidebar-accent text-sidebar-primary"
                  : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground",
              )}
            >
              {collapsed && <Icon className="size-[15px]" />}
              {!collapsed && page.label}
            </Link>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex h-svh w-full flex-col overflow-hidden bg-background text-foreground">
      {/* Top bar */}
      <header className="flex h-12 shrink-0 items-center gap-1 border-b border-sidebar-border bg-sidebar px-2 sm:gap-4 sm:px-4">
        <button
          type="button"
          aria-label="Open menu"
          onClick={() => setMobileOpen(true)}
          className="shrink-0 rounded-sm p-1 text-sidebar-foreground/60 hover:text-sidebar-foreground md:hidden"
        >
          <Menu className="size-[19px]" />
        </button>

        <button
          type="button"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          onClick={() => setCollapsed((v) => !v)}
          className="hidden shrink-0 rounded-sm p-1 text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground md:inline-flex"
        >
          {collapsed ? (
            <PanelLeftOpen className="size-[17px]" />
          ) : (
            <PanelLeftClose className="size-[17px]" />
          )}
        </button>

        <Link href="/dashboard" className="flex shrink-0 items-center gap-2 pr-2">
          <Mark />
          <span className="text-[15px] tracking-tight text-sidebar-foreground">EduTun</span>
        </Link>

        <nav
          className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {sections.map((s) => {
            const active = s.href === activeSection.href;
            return (
              <Link
                key={s.href}
                href={s.href}
                className={cn(
                  "relative flex shrink-0 items-center gap-1.5 whitespace-nowrap px-2.5 py-3.5 text-[13px] transition-colors sm:px-3",
                  active ? "text-sidebar-primary" : "text-sidebar-foreground/60 hover:text-sidebar-foreground",
                )}
              >
                <s.icon className="size-[14px]" />
                <span className="hidden sm:inline">{s.label}</span>
                <span
                  className={cn(
                    "absolute inset-x-2.5 -bottom-px h-[2px] rounded-full bg-sidebar-primary transition-opacity sm:inset-x-3",
                    active ? "opacity-100" : "opacity-0",
                  )}
                />
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-3">
          <button
            type="button"
            aria-label="Search"
            className="rounded-sm p-1 text-sidebar-foreground/60 hover:text-sidebar-foreground"
          >
            <Search className="size-4" />
          </button>
          <div className="flex size-7 items-center justify-center rounded-full bg-sidebar-accent text-[11px] font-medium text-sidebar-accent-foreground">
            {initials}
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Mobile sidebar */}
        <div
          className={cn(
            "fixed inset-0 z-40 bg-black/40 transition-opacity duration-200 md:hidden",
            mobileOpen ? "opacity-100" : "pointer-events-none opacity-0",
          )}
          onClick={() => setMobileOpen(false)}
        />
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 flex w-64 flex-col  px-3 py-4 transition-transform duration-200 ease-out md:hidden",
            mobileOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="mb-4 flex items-center justify-between px-2">
            <span className="text-[13px] text-sidebar-foreground/60">Menu</span>
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setMobileOpen(false)}
              className="rounded-sm p-1 text-sidebar-foreground/60 hover:text-sidebar-foreground"
            >
              <X className="size-[16px]" />
            </button>
          </div>
          <SidebarPages collapsed={false} />
        </aside>

        {/* Desktop sidebar */}
        <aside
          className={cn(
            "hidden shrink-0 flex-col overflow-y-auto border-r border-sidebar-border  py-4 transition-[width] duration-200 ease-out md:flex",
            collapsed ? "w-14 items-center px-2" : "w-60 px-3",
          )}
        >
          <SidebarPages collapsed={collapsed} />
        </aside>

        {/* Content */}
        <main className="min-w-0 flex-1 overflow-y-auto px-6 py-6">{children}</main>
      </div>
    </div>
  );
}
