"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Check, Layers, PackageOpen, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type SubscriptionPlan = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  monthlyPriceCents: number;
  quarterlyPriceCents: number;
  yearlyPriceCents: number;
  domain: {
    id: string;
    name: string;
    slug: string;
  };
};

const billingCycles = [
  { value: "month", label: "1 month" },
  { value: "quarter", label: "3 months" },
  { value: "year", label: "Full year" },
] as const;

function formatPrice(priceCents: number) {
  return priceCents > 0 ? `${(priceCents / 100).toFixed(2)} TND` : "Free";
}

export default function PacksPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [selectedCycle, setSelectedCycle] = useState<(typeof billingCycles)[number]["value"]>("month");
  const [subscribing, setSubscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/subscriptions")
      .then(async (response) => {
        const json = await response.json();
        if (!response.ok) throw new Error(json.error?.message ?? "Unable to load subscriptions.");
        const nextPlans = json.data?.plans ?? [];
        setPlans(nextPlans);
        if (nextPlans[0]) setSelectedPlanId(nextPlans[0].id);
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Unable to load subscriptions."))
      .finally(() => setLoading(false));
  }, []);

  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.id === selectedPlanId) ?? plans[0] ?? null,
    [plans, selectedPlanId],
  );

  const currentPrice = selectedPlan
    ? selectedCycle === "month"
      ? selectedPlan.monthlyPriceCents
      : selectedCycle === "quarter"
        ? selectedPlan.quarterlyPriceCents
        : selectedPlan.yearlyPriceCents
    : 0;

  async function subscribe() {
    if (!selectedPlan) return;

    setError(null);
    setSuccess(null);
    setSubscribing(true);

    try {
      const response = await fetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: selectedPlan.id,
          billingCycle: selectedCycle,
        }),
      });

      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(json.error?.message ?? "Could not activate this subscription.");
      }

      setSuccess(`Your ${selectedPlan.name} subscription is now active.`);
      router.push("/learn");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not activate this subscription.");
    } finally {
      setSubscribing(false);
    }
  }

  return (
    <main className="min-h-[calc(100svh-56px)] bg-background text-foreground">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8 flex items-center gap-2 text-sm text-primary">
          <Layers className="h-4 w-4" />
          Subscription plans
        </div>

        {loading ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2].map((index) => (
              <div key={index} className="h-72 animate-pulse rounded-2xl bg-muted" />
            ))}
          </div>
        ) : plans.length === 0 ? (
          <div className="mt-10 flex flex-col items-center gap-3 rounded-lg border border-dashed border-border p-14 text-center text-muted-foreground">
            <PackageOpen className="h-6 w-6" />
            <p className="text-sm">No subscription plans are available yet. Please check back soon.</p>
          </div>
        ) : (
          <div className="grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-5">
              {plans.map((plan) => {
                const isSelected = selectedPlanId === plan.id;
                return (
                  <Card
                    key={plan.id}
                    className={`cursor-pointer border-2 p-5 transition ${
                      isSelected ? "border-primary bg-primary/5" : "border-border bg-card"
                    }`}
                    onClick={() => setSelectedPlanId(plan.id)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.16em] text-primary">{plan.domain.name}</p>
                        <h2 className="mt-2 text-2xl font-semibold">{plan.name}</h2>
                      </div>
                      {isSelected && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                          <Check className="h-3.5 w-3.5" /> Selected
                        </span>
                      )}
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground">{plan.description}</p>
                    <div className="mt-5 grid gap-3 sm:grid-cols-3">
                      <div className="rounded-xl border border-border bg-background p-3">
                        <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">1 month</p>
                        <p className="mt-2 text-lg font-semibold">{formatPrice(plan.monthlyPriceCents)}</p>
                      </div>
                      <div className="rounded-xl border border-border bg-background p-3">
                        <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">3 months</p>
                        <p className="mt-2 text-lg font-semibold">{formatPrice(plan.quarterlyPriceCents)}</p>
                      </div>
                      <div className="rounded-xl border border-border bg-background p-3">
                        <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Full year</p>
                        <p className="mt-2 text-lg font-semibold">{formatPrice(plan.yearlyPriceCents)}</p>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>

            <aside className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                Billing
              </div>

              <h3 className="mt-4 text-2xl font-semibold">{selectedPlan?.name ?? "Choose a plan"}</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {selectedPlan?.description ?? "Select a domain to begin your subscription."}
              </p>

              <div className="mt-5 space-y-2">
                {billingCycles.map((cycle) => (
                  <button
                    key={cycle.value}
                    type="button"
                    onClick={() => setSelectedCycle(cycle.value)}
                    className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left text-sm transition ${
                      selectedCycle === cycle.value
                        ? "border-primary bg-primary/5 text-foreground"
                        : "border-border bg-background text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    <span>{cycle.label}</span>
                    <span className="font-medium text-foreground">
                      {selectedPlan
                        ? formatPrice(
                            cycle.value === "month"
                              ? selectedPlan.monthlyPriceCents
                              : cycle.value === "quarter"
                                ? selectedPlan.quarterlyPriceCents
                                : selectedPlan.yearlyPriceCents,
                          )
                        : "—"}
                    </span>
                  </button>
                ))}
              </div>

              <div className="mt-6 rounded-xl border border-border bg-muted/30 p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Total</p>
                <div className="mt-2 flex items-end justify-between gap-3">
                  <span className="text-3xl font-semibold">{formatPrice(currentPrice)}</span>
                  <span className="text-xs text-muted-foreground">/{selectedCycle === "month" ? "month" : selectedCycle === "quarter" ? "3 months" : "year"}</span>
                </div>
              </div>

              {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
              {success && <p className="mt-4 text-sm text-primary">{success}</p>}

              <Button className="mt-6 w-full" onClick={subscribe} disabled={!selectedPlan || subscribing}>
                {subscribing ? "Activating..." : "Subscribe now"}
              </Button>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}
