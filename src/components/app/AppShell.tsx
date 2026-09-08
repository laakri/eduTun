// components/app/AppShell.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  Menu,
  Settings,
  Users,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";

type Page = {
  label: string;
  href: string;
  children?: Page[];
  adminOnly?: boolean;
};

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
          {
            label: "Baccalauréat",
            href: "/courses/categories/bac",
          },
          {
            label: "Languages",
            href: "/courses/categories/languages",
          },
        ],
      },
      {
        label: "New course",
        href: "/courses/new",
      },
      {
        label: "Professor applications",
        href: "/admin/professor-applications",
        adminOnly: true,
      },
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
  const [collapsed, setCollapsed] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const activeSection = (() => {
    const found = sections.find((section) =>
      pathname?.startsWith(section.href),
    );

    return found ?? sections[0]!;
  })();

  function SidebarPages({ collapsed }: { collapsed: boolean }) {
    return (
      <div className="flex flex-1 flex-col gap-0.5">
        {!collapsed && (
          <div className="mb-3 flex items-center gap-2 px-2.5 text-[13px] font-medium text-sidebar-foreground">
            <activeSection.icon className="size-[15px]" />
            {activeSection.label}
          </div>
        )}

        {activeSection.pages
          .filter((page) => !page.adminOnly || user?.roles?.includes("admin"))
          .map((page) => {
            const active = pathname === page.href;
            const isOpen = expanded === page.href;

            if (page.children) {
              if (collapsed) return null;

              return (
                <div key={page.href}>
                  <button
                    type="button"
                    onClick={() => setExpanded(isOpen ? null : page.href)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-sm px-2.5 py-[7px] text-[13px] transition-colors",
                      "hover:bg-sidebar-accent",
                      isOpen
                        ? "text-sidebar-foreground"
                        : "text-sidebar-foreground/60",
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
                            "rounded-sm px-2 py-[6px] text-[13px] transition-colors",
                            "hover:bg-sidebar-accent",
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

            return (
              <Link
                key={page.href}
                href={page.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center rounded-sm px-2.5 py-[7px] text-[13px] transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-primary"
                    : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                )}
              >
                {page.label}
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
        {/* Mobile menu */}
        <button
          type="button"
          aria-label="Open menu"
          onClick={() => setMobileOpen(true)}
          className="shrink-0 rounded-sm p-1 text-sidebar-foreground/60 hover:text-sidebar-foreground md:hidden"
        >
          <Menu className="size-[19px]" />
        </button>

        {/* Desktop navigation */}
        <nav className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {sections.map((section) => {
            const active = section.href === activeSection.href;

            return (
              <Link
                key={section.href}
                href={section.href}
                className={cn(
                  "relative flex shrink-0 items-center gap-1.5 whitespace-nowrap px-2.5 py-3.5 text-[13px] transition-colors sm:px-3",
                  active
                    ? "text-sidebar-primary"
                    : "text-sidebar-foreground/60 hover:text-sidebar-foreground",
                )}
              >
                <section.icon className="size-[14px]" />

                <span className="hidden sm:inline">{section.label}</span>

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
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Mobile overlay */}
        <div
          className={cn(
            "fixed inset-0 z-40 bg-black/40 transition-opacity duration-200 md:hidden",
            mobileOpen ? "opacity-100" : "pointer-events-none opacity-0",
          )}
          onClick={() => setMobileOpen(false)}
        />

        {/* Mobile sidebar */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 flex w-64 flex-col px-3 py-4 transition-transform duration-200 ease-out md:hidden",
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
        {/* Desktop sidebar */}
        <aside
          className={cn(
            "relative hidden shrink-0 flex-col overflow-visible border-r border-sidebar-border py-4 transition-[width] duration-200 ease-out md:flex",
            collapsed ? "w-12 items-center px-0" : "w-60 px-3",
          )}
        >
          {/* Scrollable sidebar content */}
          <div className="min-h-0 flex-1 overflow-y-auto">
            {!collapsed && <SidebarPages collapsed={false} />}
          </div>

          {/* Collapsed rail */}
          {collapsed && (
            <div className="absolute inset-0 flex items-center justify-center">
              <button
                type="button"
                onClick={() => setCollapsed(false)}
                aria-label="Expand sidebar"
                title="Expand sidebar"
                className={cn(
                  "flex size-8 items-center justify-center rounded-md",
                  "text-sidebar-foreground/50",
                  "transition-colors duration-150",
                  "hover:bg-sidebar-accent",
                  "hover:text-sidebar-foreground",
                )}
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          )}

          {/* Collapse button */}
          {!collapsed && (
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              aria-label="Collapse sidebar"
              title="Collapse sidebar"
              className={cn(
                "absolute right-[-10px] top-1/2 z-50",
                "-translate-y-1/2",
                "flex size-5 items-center justify-center",
                "rounded-full",
                "border border-sidebar-border",
                "bg-sidebar",
                "text-sidebar-foreground/50",
                "shadow-sm",
                "transition-colors duration-150",
                "hover:bg-sidebar-accent",
                "hover:text-sidebar-foreground",
              )}
            >
              <ChevronLeft className="size-3" />
            </button>
          )}
        </aside>

        {/* Content */}
        <main className="min-w-0 flex-1 overflow-y-auto px-6 py-6">
          {children}
        </main>
      </div>
    </div>
  );
}
