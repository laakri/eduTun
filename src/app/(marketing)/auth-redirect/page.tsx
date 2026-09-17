"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { getDefaultAppPath } from "@/lib/nav";

export default function AuthRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    fetch("/api/auth/session", { cache: "no-store" })
      .then((response) => response.json())
      .then((session) => {
        if (!cancelled) {
          const roles = session?.user?.roles ?? [];
          const destination = roles.some((role: string) => ["admin", "prof"].includes(role))
            ? getDefaultAppPath(roles)
            : getDefaultAppPath(roles);
          router.replace(destination);
          router.refresh();
        }
      })
      .catch(() => {
        if (!cancelled) router.replace("/register?mode=login");
      });

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <main className="flex min-h-[70svh] items-center justify-center text-sm text-muted-foreground">
      Opening your workspace...
    </main>
  );
}