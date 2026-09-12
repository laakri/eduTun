"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

 type AccessRequest = {
  id: string;
  status: string;
  reviewNote: string | null;
  createdAt: string;
  user: { id: string; fullName: string; email: string };
  plan: { id: string; name: string; slug: string };
  bacType: { id: string; name: string; slug: string };
};

export default function BacAccessRequestsPage() {
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadRequests() {
    try {
      const response = await fetch("/api/admin/bac-access-requests");
      const json = await response.json();
      if (!response.ok) throw new Error(json.error?.message ?? "Could not load access requests.");
      setRequests(json.data ?? []);
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load access requests.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadRequests();
  }, []);

  async function decide(id: string, decision: "approved" | "rejected") {
    setWorkingId(id);
    setError(null);
    try {
      const response = await fetch(`/api/admin/bac-access-requests/${id}/decision`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error?.message ?? "Could not save the decision.");
      await loadRequests();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save the decision.");
    } finally {
      setWorkingId(null);
    }
  }

  return (
    <main className="mx-auto max-w-5xl">
      <div>
        <p className="text-sm font-medium text-primary">Admin review</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Bac access requests</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Approve a learner before activating their Bac subscription. Payment is not part of this flow.
        </p>
      </div>

      {error && <p className="mt-5 text-sm text-destructive">{error}</p>}
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
      ) : requests.length === 0 ? (
        <Card className="mt-8 p-8 text-center text-sm text-muted-foreground">No Bac access requests yet.</Card>
      ) : (
        <div className="mt-8 space-y-3">
          {requests.map((request) => (
            <Card key={request.id} className="p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold">{request.user.fullName}</h2>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs capitalize">{request.status}</span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{request.user.email}</p>
                  <p className="mt-4 text-sm"><span className="font-medium">Bac:</span> {request.bacType.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground"><span className="font-medium text-foreground">Access plan:</span> {request.plan.name}</p>
                  <p className="mt-2 text-xs text-muted-foreground">Requested {new Date(request.createdAt).toLocaleString()}</p>
                </div>

                {request.status === "pending" && (
                  <div className="flex shrink-0 gap-2">
                    <Button size="sm" onClick={() => void decide(request.id, "approved")} disabled={workingId === request.id}>
                      <Check className="size-4" /> Approve
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => void decide(request.id, "rejected")} disabled={workingId === request.id}>
                      <X className="size-4" /> Reject
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
