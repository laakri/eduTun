"use client";

import Link from "next/link";
import { Moon, Sun, Menu, Search } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoginModal } from "@/components/LoginModal";

import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";

import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

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
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-md">
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
              <NavigationMenuItem>
                <Link
                  href="/packs"
                  className="text-sm text-muted-foreground hover:text-foreground transition"
                >
                  Packs
                </Link>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <Link
                  href="/apply/professor"
                  className="text-sm text-muted-foreground hover:text-foreground transition"
                >
                  Become a professor
                </Link>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <Link
                  href="/docs"
                  className="text-sm text-muted-foreground hover:text-foreground transition"
                >
                  Docs
                </Link>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <Link
                  href="/courses"
                  className="text-sm text-muted-foreground hover:text-foreground transition"
                >
                  About
                </Link>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <Link
                  href="/courses"
                  className="text-sm text-muted-foreground hover:text-foreground transition"
                >
                  Contact
                </Link>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>

          <ThemeToggle />
          <LoginModal />

          <Link href="/test" className="hidden md:block">
            <Button size="sm" variant="outline">Test platform</Button>
          </Link>

          <Link href="/register" className="hidden md:block">
            <Button size="sm">Get Started</Button>
          </Link>

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

              <SheetContent side="right" className="w-72">
                <div className="flex flex-col gap-6 mt-10">
                  <Link href="/packs">Packs</Link>
                  <Link href="/apply/professor">Become a professor</Link>
                  <Link href="/test">Test platform</Link>
                  <Link href="/docs">Docs</Link>

                  <div className="mt-6 flex flex-col gap-2">
                    <LoginModal mobile />
                    <Button>Get Started</Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
