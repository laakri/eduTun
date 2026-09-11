"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Check, Loader2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";

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
  {
    value: "month",
    label: "Monthly",
  },
  {
    value: "quarter",
    label: "3 months",
  },
  {
    value: "year",
    label: "Yearly",
  },
] as const;

type BillingCycle = (typeof billingCycles)[number]["value"];

function formatPrice(priceCents: number) {
  if (priceCents === 0) return "Free";

  return `${(priceCents / 100).toFixed(2)} TND`;
}

function getPrice(plan: SubscriptionPlan, cycle: BillingCycle) {
  switch (cycle) {
    case "quarter":
      return plan.quarterlyPriceCents;
    case "year":
      return plan.yearlyPriceCents;
    default:
      return plan.monthlyPriceCents;
  }
}

function getPeriodLabel(cycle: BillingCycle) {
  switch (cycle) {
    case "quarter":
      return "3 months";
    case "year":
      return "year";
    default:
      return "month";
  }
}

export default function PacksPage() {
  const router = useRouter();

  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCycle, setSelectedCycle] =
    useState<BillingCycle>("month");
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [subscribingPlanId, setSubscribingPlanId] = useState<string | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadPlans() {
      try {
        const response = await fetch("/api/subscriptions");

        const json = await response.json();

        if (!response.ok) {
          throw new Error(
            json.error?.message ?? "Unable to load subscription plans.",
          );
        }

        const nextPlans: SubscriptionPlan[] = json.data?.plans ?? [];

        setPlans(nextPlans);

        if (nextPlans.length > 0) {
          setSelectedPlanId(nextPlans[0].id);
        }
      } catch (reason) {
        setError(
          reason instanceof Error
            ? reason.message
            : "Unable to load subscription plans.",
        );
      } finally {
        setLoading(false);
      }
    }

    loadPlans();
  }, []);

  const selectedPlan = useMemo(
    () =>
      plans.find((plan) => plan.id === selectedPlanId) ??
      plans[0] ??
      null,
    [plans, selectedPlanId],
  );

  async function subscribe(plan: SubscriptionPlan) {
    setError(null);
    setSubscribingPlanId(plan.id);

    try {
      const response = await fetch("/api/subscriptions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          planId: plan.id,
          billingCycle: selectedCycle,
        }),
      });

      const json = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          json.error?.message ?? "Could not activate this subscription.",
        );
      }

      router.push("/learn");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Could not activate this subscription.",
      );
    } finally {
      setSubscribingPlanId(null);
    }
  }

  return (
    <main className="min-h-[calc(100svh-56px)] bg-background text-foreground">
      <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8 lg:px-10">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">

          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Choose your learning pack
          </h1>

          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
            Pick the plan that fits your learning goals. You can change your
            pack whenever you want.
          </p>
        </div>

        {/* Billing selector */}
        <div className="mt-8 flex justify-center">
          <div className="inline-flex rounded-xl border border-border bg-muted/40 p-1">
            {billingCycles.map((cycle) => {
              const active = selectedCycle === cycle.value;

              return (
                <button
                  key={cycle.value}
                  type="button"
                  onClick={() => setSelectedCycle(cycle.value)}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                    active
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {cycle.label}

                  {cycle.value === "year" && (
                    <span className="ml-1.5 text-xs text-primary">
                      Save
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {error && (
          <div className="mx-auto mt-6 max-w-2xl rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-center text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Plans */}
        {loading ? (
          <div className="mx-auto mt-12 grid max-w-6xl gap-5 md:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((index) => (
              <div
                key={index}
                className="h-[460px] animate-pulse rounded-2xl bg-muted"
              />
            ))}
          </div>
        ) : plans.length === 0 ? (
          <div className="mx-auto mt-12 max-w-lg rounded-2xl border border-border p-10 text-center">
            <p className="text-sm text-muted-foreground">
              No subscription packs are available right now.
            </p>
          </div>
        ) : (
          <div
            className={`mx-auto mt-12 grid max-w-6xl gap-5 ${
              plans.length === 1
                ? "max-w-md"
                : plans.length === 2
                  ? "max-w-4xl md:grid-cols-2"
                  : "lg:grid-cols-3"
            }`}
          >
            {plans.map((plan, index) => {
              const price = getPrice(plan, selectedCycle);
              const isSelected = selectedPlan?.id === plan.id;
              const isPopular =
                plans.length >= 3 && index === Math.floor(plans.length / 2);
              const isSubscribing = subscribingPlanId === plan.id;

              return (
                <div
                  key={plan.id}
                  onClick={() => setSelectedPlanId(plan.id)}
                  className={`relative flex cursor-pointer flex-col rounded-2xl border p-6 transition-all duration-200 ${
                    isPopular
                      ? "border-primary shadow-lg shadow-primary/10"
                      : isSelected
                        ? "border-primary/50"
                        : "border-border"
                  } ${
                    isSelected
                      ? "bg-card"
                      : "bg-card/50 hover:border-primary/30 hover:bg-card"
                  }`}
                >
                  {/* Popular badge */}
                  {isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                      Most popular
                    </div>
                  )}

                  {/* Pack header */}
                  <div>
                    <p className="text-sm font-medium text-primary">
                      {plan.domain.name}
                    </p>

                    <h2 className="mt-3 text-2xl font-semibold tracking-tight">
                      {plan.name}
                    </h2>

                    <p className="mt-2 min-h-12 text-sm leading-5 text-muted-foreground">
                      {plan.description ??
                        "Everything you need to keep learning and improving."}
                    </p>
                  </div>

                  {/* Price */}
                  <div className="mt-7">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-semibold tracking-tight">
                        {formatPrice(price)}
                      </span>

                      {price > 0 && (
                        <span className="text-sm text-muted-foreground">
                          / {getPeriodLabel(selectedCycle)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="my-6 h-px bg-border" />

                  {/* Features */}
                  <div className="flex-1">
                    <p className="mb-4 text-sm font-medium">
                      This pack includes:
                    </p>

                    <ul className="space-y-3">
                      <li className="flex gap-3 text-sm text-muted-foreground">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        Access to included courses
                      </li>

                      <li className="flex gap-3 text-sm text-muted-foreground">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        Learn at your own pace
                      </li>

                      <li className="flex gap-3 text-sm text-muted-foreground">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        Course progress tracking
                      </li>

                      <li className="flex gap-3 text-sm text-muted-foreground">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        Access for the selected period
                      </li>
                    </ul>
                  </div>

                  {/* CTA */}
                  <Button
                    className={`mt-8 h-11 w-full rounded-xl ${
                      isPopular
                        ? ""
                        : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    }`}
                    onClick={(event) => {
                      event.stopPropagation();
                      subscribe(plan);
                    }}
                    disabled={isSubscribing}
                  >
                    {isSubscribing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Activating...
                      </>
                    ) : isSelected ? (
                      "Get started"
                    ) : (
                      "Choose pack"
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        {/* Bottom note */}
        {!loading && plans.length > 0 && (
          <p className="mx-auto mt-8 max-w-xl text-center text-xs text-muted-foreground">
            You can select a different billing period above before subscribing.
          </p>
        )}
      </div>
    </main>
  );
}
