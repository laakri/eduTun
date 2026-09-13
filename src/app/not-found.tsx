import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-[calc(100svh-3.5rem)] items-center px-6 py-16">
      <section className="mx-auto w-full max-w-3xl">
        <p className="text-sm font-medium text-muted-foreground">404</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          Page not found
        </h1>
        <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">
          The page you are looking for does not exist or may have moved.
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/">Go home</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/learn">Browse courses</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/packs">
              <ArrowLeft className="mr-2 size-4" />
              Explore packs
            </Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
