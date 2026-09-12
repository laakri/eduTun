"use client";

import Link from "next/link";
import {
  Moon,
  Sun,
  Menu,
  Search,
  LayoutDashboard,
  BookOpen,
  Users,
  Settings,
  LogOut,
  UserRound,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { canManageCourses } from "@/core/permissions";

import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const NAV_LINKS = [
  { href: "/packs", label: "Packs" },
  { href: "/docs", label: "Docs" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

const WORKSPACE_LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/courses", label: "Courses", icon: BookOpen },
  { href: "/students", label: "Students", icon: Users },
  { href: "/settings/profile", label: "Settings", icon: Settings },
];

const ADMIN_LINKS = [
  { href: "/admin", label: "Admin", icon: LayoutDashboard },
];

function ThemeToggle() {
  const { setTheme, theme } = useTheme();

  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const isDark = mounted && theme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label="Toggle theme"
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}

function initials(name?: string | null) {
  if (!name) return "?";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function AccountMenu() {
  const { data: session } = useSession();
  const name = session?.user?.name;
  const email = session?.user?.email;
  const avatarUrl = (session?.user as { image?: string | null } | undefined)?.image;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 pl-2 pr-2.5"
            aria-label="Open account menu"
          />
        }
      >
        <span className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-full bg-muted text-[11px] font-medium text-foreground">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt={name ?? "Account"} className="h-full w-full object-cover" />
          ) : (
            initials(name)
          )}
        </span>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        {(name || email) && (
          <>
            <DropdownMenuGroup>
              <DropdownMenuLabel className="flex flex-col gap-0.5">
                {name && <span className="text-sm font-medium text-foreground">{name}</span>}
                {email && (
                  <span className="text-xs font-normal text-muted-foreground">{email}</span>
                )}
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
          </>
        )}

        <DropdownMenuGroup>
          <DropdownMenuItem render={<Link href="/dashboard" className="flex items-center gap-2" />}>
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </DropdownMenuItem>

          <DropdownMenuItem render={<Link href="/professor/myid" className="flex items-center gap-2" />}>
            <UserRound className="h-4 w-4" />
            Profile
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuItem
            variant="destructive"
            onClick={() => signOut()}
            className="flex items-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function Navbar() {
  const { status, data: session } = useSession();
  const pathname = usePathname();
  const isLoggedIn = status === "authenticated";
  const isLoading = status === "loading";
  const isManager = isLoggedIn && canManageCourses(session?.user?.roles);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-transparent bg-background/80 backdrop-blur-md">
      <div className="flex h-14 items-center gap-4 px-4">
        {/* LEFT - BRAND */}

        <div>
          <Link href="/" className="font-semibold text-foreground">
            EduTun<span className="text-primary">.</span>
          </Link>
        </div>

        {/* SEARCH (like OpenRouter) */}
        <div className="hidden md:flex w-[320px] items-center justify-center relative ">
          <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search courses, exams..."
            className="pl-9 h-9 bg-muted/40 border-muted"
          />
        </div>
        {/* CENTER - NAV */}
        <div className="flex flex-1 items-center justify-end gap-4">
          {/* NAV ITEMS */}
          <NavigationMenu className="hidden md:flex">
            <NavigationMenuList className="flex gap-6">
              {NAV_LINKS.map((link) => (
                <NavigationMenuItem key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition"
                  >
                    {link.label}
                  </Link>
                </NavigationMenuItem>
              ))}
            </NavigationMenuList>
          </NavigationMenu>

          <ThemeToggle />

          {/* AUTH AREA - DESKTOP */}
          {!isLoading && (
            <div className="hidden md:flex items-center gap-2">
              {isLoggedIn ? (
                <>
                  {!isManager && (
                    <Link
                      href="/learn"
                      className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <BookOpen className="size-4" />
                      My courses
                    </Link>
                  )}
                  <AccountMenu />
                </>
              ) : (
                <>
                  <Link href="/register?mode=login">
                    <Button size="sm" variant="ghost">
                      Login
                    </Button>
                  </Link>

                  <Link href="/register?mode=signup">
                    <Button size="sm">Get Started</Button>
                  </Link>
                </>
              )}
            </div>
          )}

          {/* MOBILE MENU */}
          <div className="md:hidden flex items-center gap-2">
            <Sheet>
              <SheetTrigger
                render={
                  <Button variant="ghost" size="icon" aria-label="Open navigation menu" />
                }
              >
                <Menu className="h-5 w-5" />
              </SheetTrigger>

              <SheetContent side="right" className="flex w-[85vw] max-w-sm flex-col gap-0 p-0">
                <SheetHeader className="border-b border-muted px-5 py-4">
                  <SheetTitle className="text-left font-semibold text-foreground">
                    EduTun<span className="text-primary">.</span>
                  </SheetTitle>
                </SheetHeader>

                <div className="flex flex-1 flex-col overflow-y-auto px-5 py-5">
                  {/* SEARCH */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search courses, exams..."
                      className="h-10 border-muted bg-muted/40 pl-9"
                    />
                  </div>

                  {/* NAV LINKS */}
                  <nav className="mt-6 flex flex-col">
                    {NAV_LINKS.map((link) => (
                      <Link
                        key={link.label}
                        href={link.href}
                        className="flex items-center justify-between rounded-md px-2 py-3 text-[15px] text-foreground transition hover:bg-muted/50"
                      >
                        {link.label}
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </Link>
                    ))}
                  </nav>

                  <div className="my-6 h-px bg-muted" />

                  {/* ACCOUNT / AUTH */}
                  <div className="flex flex-col gap-2.5">
                    {isLoading ? null : isLoggedIn ? (
                      <>
                        <Link href="/learn">
                          <Button variant="outline" className="h-11 w-full justify-start gap-2.5 text-[15px]">
                            <BookOpen className="h-4 w-4" />
                            My courses
                          </Button>
                        </Link>
                        <Link href="/dashboard">
                          <Button variant="outline" className="h-11 w-full justify-start gap-2.5 text-[15px]">
                            <LayoutDashboard className="h-4 w-4" />
                            Dashboard
                          </Button>
                        </Link>
                        <Link href="/professor/myid">
                          <Button variant="outline" className="h-11 w-full justify-start gap-2.5 text-[15px]">
                            <UserRound className="h-4 w-4" />
                            Profile
                          </Button>
                        </Link>
                        {session?.user?.roles?.includes("admin") && (
                          <Link href="/admin">
                            <Button variant="outline" className="h-11 w-full justify-start gap-2.5 text-[15px]">
                              <LayoutDashboard className="h-4 w-4" />
                              Admin workspace
                            </Button>
                          </Link>
                        )}
                        <Button
                          variant="ghost"
                          className="h-11 w-full justify-start gap-2.5 text-[15px] text-destructive hover:text-destructive"
                          onClick={() => signOut()}
                        >
                          <LogOut className="h-4 w-4" />
                          Sign out
                        </Button>
                      </>
                    ) : (
                      <>
                        <Link href="/register?mode=login">
                          <Button variant="outline" className="h-11 w-full justify-start gap-2.5 text-[15px]">
                            Login
                          </Button>
                        </Link>
                        <Link href="/register?mode=signup">
                          <Button className="h-11 w-full text-[15px]">Get Started</Button>
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
  {isManager && (
  <div className="hidden border-t border-border bg-background md:block">
    <nav className="mx-auto flex h-11 max-w-7xl items-center justify-start gap-7 overflow-x-auto px-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {[...WORKSPACE_LINKS, ...(session?.user?.roles?.includes("admin") ? ADMIN_LINKS : [])].map((link) => {
        const active =
          pathname === link.href || pathname.startsWith(`${link.href}/`);

        return (
          <Link
            key={link.href}
            href={link.href}
            className={[
              "group relative flex h-full shrink-0 items-center gap-1.5 text-[13px] font-medium transition-colors",
              active
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            <link.icon className="size-[14px]" />
            <span>{link.label}</span>

            <span
              className={[
                "absolute bottom-0 left-0 h-0.5 rounded-full bg-primary transition-all duration-200",
                active ? "w-full" : "w-0 group-hover:w-full",
              ].join(" ")}
            />
          </Link>
        );
      })}
    </nav>
  </div>
)}
    </header>
  );
}