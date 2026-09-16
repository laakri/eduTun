"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, GraduationCap, Loader2, Users } from "lucide-react";

import { Button } from "@/components/ui/button";

type BacType = { id: string; name: string; slug: string };
type AccessState = { status: string; bacTypeName: string | null } | null;
type AccountType = "student" | "professor";
type Step = "type" | "details";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("type");
  const [accountType, setAccountType] = useState<AccountType | null>(null);
  const [bacTypes, setBacTypes] = useState<BacType[]>([]);
  const [bacTypeId, setBacTypeId] = useState("");
  const [access, setAccess] = useState<AccessState>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [categoriesResponse, accessResponse] = await Promise.all([
          fetch("/api/categories"),
          fetch("/api/bac-access-requests"),
        ]);
        const categoriesJson = await categoriesResponse.json();
        const accessJson = await accessResponse.json();

        if (!categoriesResponse.ok || !accessResponse.ok) {
          throw new Error("Could not load your onboarding options.");
        }

        const options = (categoriesJson.data?.[0]?.children ?? []) as BacType[];
        const request = accessJson.data?.requests?.[0];
        const subscription = accessJson.data?.subscriptions?.[0];

        setBacTypes(options);
        setBacTypeId("");
        const savedBacType = accessJson.data?.bacType;
        setAccess(
          savedBacType
            ? { status: "saved", bacTypeName: savedBacType.name }
            : request
              ? { status: request.status, bacTypeName: request.bacType?.name ?? null }
              : subscription
                ? { status: "approved", bacTypeName: subscription.bacType?.name ?? null }
                : null,
        );
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : "Could not load your onboarding options.");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  async function chooseStudent() {
    if (!bacTypeId || submitting) return;
    setError("");
    setSubmitting(true);

    try {
      const response = await fetch("/api/bac-access-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bacTypeId,
        }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error?.message ?? "Could not save your Bac choice.");
      setAccess({ status: "saved", bacTypeName: bacTypes.find((item) => item.id === bacTypeId)?.name ?? null });
      router.push("/packs");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save your Bac choice.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <main className="flex min-h-[70svh] items-center justify-center"><Loader2 className="size-5 animate-spin text-muted-foreground" /></main>;
  }

  return (
    <main className="min-h-[calc(100svh-56px)] bg-background text-foreground">
      <div className="mx-auto flex min-h-[70svh] max-w-xl items-center px-6 py-14">
        <div className="w-full">
          <p className="text-sm font-medium text-primary">{step === "type" ? "Step 1 of 2" : "Step 2 of 2"}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            {step === "type" ? "Tell us how you will use EduTun." : accountType === "student" ? "Which Bac are you preparing?" : "Almost there."}
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {step === "type"
              ? "Choose your path to get started."
              : accountType === "student"
                ? "Pick your Bac program so we can show you the right courses."
                  : "Apply to teach, or continue as a guest and explore EduTun."}
          </p>

          {step === "type" ? (
            <>
              <div className="mt-8 grid grid-cols-2 gap-3">
                {(["student", "professor"] as const).map((type) => {
                  const selected = accountType === type;
                  const Icon = type === "student" ? GraduationCap : Users;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setAccountType(type)}
                      className={`relative flex aspect-square flex-col items-center justify-center gap-2 rounded-xl border text-sm font-medium shadow-sm transition-colors ${
                        selected
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border bg-card hover:bg-muted/50"
                      }`}
                    >
                      {selected && <CheckCircle2 className="absolute right-3 top-3 size-4 text-primary" />}
                      <Icon className={`size-6 ${selected ? "text-primary" : "text-muted-foreground"}`} />
                      {type === "student" ? "Student" : "Professor"}
                    </button>
                  );
                })}
              </div>
              <Button size="sm" className="mt-6" onClick={() => setStep("details")} disabled={!accountType}>
                Next
                <ArrowRight className="ml-2 size-4" />
              </Button>
              <Button asChild size="sm" variant="link" className="ml-2 mt-6">
                <Link href="/">Skip as guest</Link>
              </Button>
            </>
          ) : (
            <div className="mt-6 space-y-4">
              {accountType === "student" ? (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    {bacTypes.map((bacType) => {
                      const selected = bacTypeId === bacType.id;
                      return (
                        <button
                          key={bacType.id}
                          type="button"
                          onClick={() => setBacTypeId(bacType.id)}
                          disabled={submitting}
                          className={`min-h-16 rounded-lg border px-3 py-2 text-left text-sm font-medium shadow-sm transition-colors ${
                            selected
                              ? "border-primary bg-primary/10 text-foreground"
                              : "border-border bg-card hover:bg-muted/50"
                          }`}
                        >
                          {selected && <CheckCircle2 className="mb-1 size-4 text-primary" />}
                          {bacType.name}
                        </button>
                      );
                    })}
                  </div>
                  {access && (
                    <p className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-muted-foreground">
                      Bac selection: <span className="font-medium text-foreground">{access.status}</span>
                      {access.bacTypeName ? ` · ${access.bacTypeName}` : ""}
                    </p>
                  )}
                  {error && <p className="text-sm text-destructive">{error}</p>}
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setStep("type")} disabled={submitting}>
                      <ArrowLeft className="mr-2 size-4" />
                      Back
                    </Button>
                    <Button size="sm" onClick={() => void chooseStudent()} disabled={submitting || !bacTypeId || Boolean(access)}>
                      {submitting ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                      {access ? "Bac choice submitted" : "Select student"}
                      {!access && <ArrowRight className="ml-2 size-4" />}
                    </Button>
                    <Button asChild size="sm" variant="link"><Link href="/">Skip as guest</Link></Button>
                  </div>
                  {access?.status === "approved" && <Button asChild size="sm" variant="outline"><Link href="/learn">Go to my courses</Link></Button>}
                </>
              ) : (
                <div className="rounded-xl border border-border bg-muted/40 p-5 shadow-sm">
                  <p className="text-sm leading-6 text-muted-foreground">Your professor application is optional. You can explore EduTun as a guest without applying.</p>
                  <div className="mt-5 flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setStep("type")}>
                      <ArrowLeft className="mr-2 size-4" />
                      Back
                    </Button>
                    <Button asChild size="sm"><Link href="/apply/professor">Start professor application <ArrowRight className="ml-2 size-4" /></Link></Button>
                    <Button asChild size="sm" variant="link"><Link href="/">Continue as guest</Link></Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}