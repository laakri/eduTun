"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Plan = {
  id: string;
  name: string;
  yearlyPriceCents: number;
  domain: { id: string; name: string };
};

type BacType = { id: string; name: string };

function formatPrice(cents: number) {
  return new Intl.NumberFormat("fr-TN", {
    style: "currency",
    currency: "TND",
  }).format(cents / 100);
}

const PAYMENT_METHODS = [
  { value: "e-dinar", label: "e-Dinar" },
  { value: "flouci", label: "Flouci" },
  { value: "card", label: "Bank card" },
] as const;

export default function CheckoutPage() {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [bacTypes, setBacTypes] = useState<BacType[]>([]);
  const [bacTypeId, setBacTypeId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("e-dinar");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const planId = new URLSearchParams(window.location.search).get("plan");

    async function load() {
      try {
        const [plansResponse, categoriesResponse] = await Promise.all([
          fetch("/api/subscriptions"),
          fetch("/api/categories"),
        ]);
        const plansJson = await plansResponse.json();
        const categoriesJson = await categoriesResponse.json();
        const availablePlans = (plansJson.data?.plans ?? []) as Plan[];
        const selectedPlan = availablePlans.find((item) => item.id === planId) ?? availablePlans[0] ?? null;

        if (!plansResponse.ok || !categoriesResponse.ok) {
          throw new Error("Could not load checkout.");
        }

        setPlan(selectedPlan);
        setBacTypes(categoriesJson.data?.[0]?.children ?? []);
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : "Could not load checkout.");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  async function submitPayment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!plan || !bacTypeId) return;

    setSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/bac-access-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: plan.id, bacTypeId }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error?.message ?? "Could not submit your payment request.");
      setSubmitted(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not submit your payment request.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-[70svh] items-center justify-center bg-muted/20">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </main>
    );
  }

  if (error && !plan) {
    return (
      <main className="mx-auto flex min-h-[70svh] max-w-xl flex-col items-center justify-center px-6 text-center">
        <p className="text-destructive">{error}</p>
        <Button asChild className="mt-5">
          <Link href="/packs">Back to pricing</Link>
        </Button>
      </main>
    );
  }

  if (!plan) {
    return (
      <main className="mx-auto flex min-h-[70svh] max-w-xl flex-col items-center justify-center px-6 text-center">
        <p className="text-muted-foreground">This plan is no longer available.</p>
        <Button asChild className="mt-5">
          <Link href="/packs">Back to pricing</Link>
        </Button>
      </main>
    );
  }

  if (submitted) {
    return (
      <main className="mx-auto flex min-h-[70svh] max-w-xl flex-col items-center justify-center px-6 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-primary/10">
          <CheckCircle2 className="size-7 text-primary" />
        </div>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight">Payment request submitted</h1>
        <p className="mt-3 max-w-sm text-muted-foreground">
          An admin will review your {plan.name} request and activate your learning space after approval.
        </p>
        <Button asChild className="mt-8">
          <Link href="/learn">Go to my courses</Link>
        </Button>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100svh-56px)] bg-muted/20 px-5 py-10 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/packs"
          className="inline-flex items-center text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="mr-2 size-4" />
          Back to pricing
        </Link>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
          <form onSubmit={submitPayment} className="rounded-2xl bg-card p-6 shadow-sm sm:p-8">
            <p className="text-sm font-medium text-primary">Secure checkout</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Complete your payment request</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Choose your Bac program and enter your Tunisian payment details. Your request is sent to an admin for
              approval.
            </p>

            <div className="mt-8 space-y-6">
              <div>
                <Label htmlFor="bacType">Bac program</Label>
                <select
                  id="bacType"
                  value={bacTypeId}
                  onChange={(event) => setBacTypeId(event.target.value)}
                  required
                  className="mt-2 flex h-10 w-full rounded-lg bg-muted/60 px-3 text-sm outline-none ring-1 ring-transparent transition-shadow focus:bg-background focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select your Bac program</option>
                  {bacTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label>Payment method</Label>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  {PAYMENT_METHODS.map(({ value, label }) => (
                    <label
                      key={value}
                      className={`cursor-pointer rounded-lg px-3 py-3 text-sm font-medium transition-colors ${
                        paymentMethod === value
                          ? "bg-primary/10 text-primary ring-1 ring-primary/40"
                          : "bg-muted/60 text-foreground hover:bg-muted"
                      }`}
                    >
                      <input
                        type="radio"
                        name="paymentMethod"
                        value={value}
                        checked={paymentMethod === value}
                        onChange={(event) => setPaymentMethod(event.target.value)}
                        className="sr-only"
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <Label htmlFor="holder">Account holder name</Label>
                  <Input id="holder" placeholder="Your full name" className="mt-2 border-0 bg-muted/60" required />
                </div>
                <div>
                  <Label htmlFor="phone">Tunisian phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="20 000 000"
                    className="mt-2 border-0 bg-muted/60"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="account">Payment account or card number</Label>
                <Input
                  id="account"
                  inputMode="numeric"
                  placeholder="0000 0000 0000 0000"
                  className="mt-2 border-0 bg-muted/60"
                  required
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <Label htmlFor="expiry">Expiry date</Label>
                  <Input id="expiry" placeholder="MM / YY" className="mt-2 border-0 bg-muted/60" required />
                </div>
                <div>
                  <Label htmlFor="reference">Transaction reference</Label>
                  <Input id="reference" placeholder="Optional" className="mt-2 border-0 bg-muted/60" />
                </div>
              </div>
            </div>

            {error && <p className="mt-5 text-sm text-destructive">{error}</p>}

            <Button type="submit" className="mt-8 w-full" disabled={submitting}>
              {submitting ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <ShieldCheck className="mr-2 size-4" />
              )}
              {submitting ? "Submitting request..." : "Submit payment request"}
            </Button>
          </form>

          <aside className="h-fit rounded-2xl bg-card p-6 shadow-sm">
            <p className="text-sm text-muted-foreground">Your plan</p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight">{plan.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{plan.domain.name}</p>

            <div className="my-6 h-px bg-muted" />

            <p className="text-sm text-muted-foreground">Annual total</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight">{formatPrice(plan.yearlyPriceCents)}</p>

            <div className="mt-6 flex items-start gap-2 rounded-lg bg-muted/50 p-3 text-xs leading-5 text-muted-foreground">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
              No access is activated until an administrator verifies this request.
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}