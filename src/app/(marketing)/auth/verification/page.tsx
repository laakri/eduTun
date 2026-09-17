"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { AlertCircle, ArrowRight, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";

function VerificationResult() {
  const searchParams = useSearchParams();
  const verified = searchParams.get("status") === "verified";

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-16 text-foreground">
      <section className="w-full max-w-md border border-border bg-background p-8 text-center sm:p-10">
        <div
          className={`mx-auto flex size-14 items-center justify-center rounded-2xl ${
            verified ? "bg-emerald-500/10 text-emerald-600" : "bg-destructive/10 text-destructive"
          }`}
        >
          {verified ? (
            <CheckCircle2 className="size-7" />
          ) : (
            <AlertCircle className="size-7" />
          )}
        </div>

        <h1 className="mt-6 text-3xl font-semibold tracking-tight">
          {verified ? "Email confirmed" : "Confirmation link unavailable"}
        </h1>

        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {verified
            ? "Your Curio account is ready. Sign in to continue to your learning space."
            : "This link may have expired, already been used, or is not valid. Request a new confirmation email from the sign-in page."}
        </p>

        <Button asChild className="mt-8 h-11 w-full">
          <Link href="/register?mode=login">
            {verified ? "Continue to sign in" : "Return to sign in"}
            <ArrowRight className="ml-2 size-4" />
          </Link>
        </Button>
      </section>
    </main>
  );
}

export default function VerificationPage() {
  return (
    <Suspense fallback={null}>
      <VerificationResult />
    </Suspense>
  );
}