"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Check, ChevronRight, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

type SubscriptionPlan = {
  id: string;
  name: string;
  description: string | null;
  yearlyPriceCents: number;
  domain: { id: string; name: string; slug: string };
};

function formatPrice(cents: number) {
  return new Intl.NumberFormat("fr-TN", {
    style: "currency",
    currency: "TND",
  }).format(cents / 100);
}

export default function PacksPage() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadPlans() {
      try {
        const response = await fetch("/api/subscriptions");
        const json = await response.json();
        if (!response.ok) {
          throw new Error(json.error?.message ?? "Unable to load subscription plans.");
        }
        const nextPlans = (json.data?.plans ?? []) as SubscriptionPlan[];
        setPlans(nextPlans);
        setSelectedPlanId(nextPlans[0]?.id ?? null);
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : "Unable to load subscription plans.");
      } finally {
        setLoading(false);
      }
    }

    void loadPlans();
  }, []);

  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.id === selectedPlanId) ?? plans[0] ?? null,
    [plans, selectedPlanId],
  );

  return (
    <main className="min-h-[calc(100svh-56px)] bg-background text-foreground">
      <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Choose your learning pack</h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
            Choose a Bac learning plan. You will confirm your program and payment method on the next step.
          </p>
        </div>
        <div className="mx-auto mt-8 max-w-2xl rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-center text-sm text-muted-foreground">
          Prices are shown in Tunisian dinars. After checkout, an admin reviews your payment request before activating access.
        </div>
        {error && <div className="mx-auto mt-6 max-w-2xl rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-center text-sm text-destructive">{error}</div>}
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
        ) : plans.length === 0 ? (
          <div className="mx-auto mt-12 max-w-lg rounded-2xl border border-border p-10 text-center text-sm text-muted-foreground">No subscription packs are available right now.</div>
        ) : (
          <div className={`mx-auto mt-12 grid max-w-6xl gap-5 ${plans.length === 1 ? "max-w-md" : plans.length === 2 ? "max-w-4xl md:grid-cols-2" : "lg:grid-cols-3"}`}>
            {plans.map((plan, index) => {
              const isSelected = selectedPlan?.id === plan.id;
              const isPopular = plans.length >= 3 && index === Math.floor(plans.length / 2);
              return (
                <div key={plan.id} onClick={() => setSelectedPlanId(plan.id)} className={`relative flex cursor-pointer flex-col rounded-2xl border p-6 transition-colors ${isPopular ? "border-primary shadow-lg shadow-primary/10" : isSelected ? "border-primary/50" : "border-border"} ${isSelected ? "bg-card" : "bg-card/50 hover:border-primary/30 hover:bg-card"}`}>
                  {isPopular && <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">Most popular</div>}
                  <p className="text-sm font-medium text-primary">{plan.domain.name}</p>
                  <h2 className="mt-3 text-2xl font-semibold tracking-tight">{plan.name}</h2>
                  <p className="mt-2 min-h-12 text-sm leading-5 text-muted-foreground">{plan.description ?? "Everything you need to keep learning and improving."}</p>
                  <div className="mt-7"><span className="text-2xl font-semibold tracking-tight">{formatPrice(plan.yearlyPriceCents)}</span><p className="mt-1 text-sm text-muted-foreground">per year, pending admin confirmation</p></div>
                  <div className="my-6 h-px bg-border" />
                  <div className="flex-1"><p className="mb-4 text-sm font-medium">This pack includes:</p><ul className="space-y-3">{["Access to included courses", "Learn at your own pace", "Course progress tracking", "Bac-specific learning access"].map((feature) => <li key={feature} className="flex gap-3 text-sm text-muted-foreground"><Check className="mt-0.5 size-4 shrink-0 text-primary" />{feature}</li>)}</ul></div>
                  <Button asChild className={`mt-8 h-11 w-full rounded-xl ${isPopular ? "" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"}`} onClick={(event) => event.stopPropagation()}><Link href={`/packs/checkout?plan=${encodeURIComponent(plan.id)}`}>Continue to payment <ChevronRight className="ml-2 size-4" /></Link></Button>
                </div>
              );
            })}
          </div>
        )}
        {!loading && plans.length > 0 && <p className="mx-auto mt-8 max-w-xl text-center text-xs text-muted-foreground">Your learning space becomes available after the admin approves the submitted payment request.</p>}
      </div>
    </main>
  );
}
