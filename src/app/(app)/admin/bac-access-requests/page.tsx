"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Loader2, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AdminPagination, AdminTableToolbar } from "@/components/admin/AdminTableToolbar";

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
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);

  const loadRequests = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/bac-access-requests?q=${encodeURIComponent(query)}&status=${status}&page=${page}`);
      const json = await response.json();
      if (!response.ok) throw new Error(json.error?.message ?? "Could not load access requests.");
      setRequests(json.data?.items ?? []);
      setPageCount(json.data?.pageCount ?? 1);
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load access requests.");
    } finally {
      setLoading(false);
    }
  }, [page, query, status]);

  useEffect(() => {
    const load = async () => {
      await loadRequests();
    };
    void load();
  }, [loadRequests]);

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

  async function removeRequest(request: AccessRequest) {
    if (request.status === "pending" || !window.confirm("Delete this reviewed request?")) return;
    const response = await fetch(`/api/admin/bac-access-requests?id=${request.id}`, { method: "DELETE" });
    if (!response.ok) { const json = await response.json(); setError(json.error?.message ?? "Could not delete request."); return; }
    setRequests((current) => current.filter((item) => item.id !== request.id));
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

      <div className="mt-8 bg-muted/20 p-3">
        <AdminTableToolbar query={query} onQueryChange={(value) => { setQuery(value); setPage(1); }} placeholder="Search learners or Bac types">
          <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className="h-9 bg-background px-3 text-sm text-foreground outline-none">
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </AdminTableToolbar>
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
                {request.status !== "pending" && <Button size="icon" variant="ghost" aria-label="Delete request" onClick={() => void removeRequest(request)}><Trash2 className="size-4 text-muted-foreground hover:text-destructive" /></Button>}
              </div>
            </Card>
          ))}
        </div>
      )}
      {!loading && requests.length > 0 && <div className="mt-5"><AdminPagination page={page} pageCount={pageCount} onPageChange={setPage} /></div>}
    </main>
  );
}
