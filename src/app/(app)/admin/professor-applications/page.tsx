"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, Trash2, X } from "lucide-react";

import { AdminPagination, AdminTableToolbar } from "@/components/admin/AdminTableToolbar";
import { Button } from "@/components/ui/button";

type Application = {
  id: string;
  fullName: string;
  phone: string;
  institution: string;
  qualification: string;
  status: string;
  applicant: { email: string };
  categories: Array<{ category: { name: string } }>;
};

export default function ProfessorApplicationsPage() {
  const [items, setItems] = useState<Application[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setLoading(true);
      void fetch(`/api/admin/professor-applications?q=${encodeURIComponent(query)}&status=${status}&page=${page}`)
        .then(async (response) => {
          const json = await response.json();
          if (!response.ok) throw new Error(json.error?.message ?? "Could not load applications.");
          setItems(json.data?.items ?? []);
          setPageCount(json.data?.pageCount ?? 1);
          setError(null);
        })
        .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Could not load applications."))
        .finally(() => setLoading(false));
    }, 180);
    return () => window.clearTimeout(timer);
  }, [page, query, status]);

  async function decide(id: string, decision: "approved" | "rejected") {
    const response = await fetch(`/api/admin/professor-applications/${id}/decision`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision }),
    });
    if (!response.ok) {
      const json = await response.json();
      setError(json.error?.message ?? "Could not save decision.");
      return;
    }
    setPage(1);
    setQuery((value) => value);
  }

  async function removeApplication(application: Application) {
    if (application.status === "pending" || !window.confirm("Delete this reviewed application?")) return;
    const response = await fetch(`/api/admin/professor-applications/${application.id}`, { method: "DELETE" });
    if (!response.ok) { const json = await response.json(); setError(json.error?.message ?? "Could not delete application."); return; }
    setItems((current) => current.filter((item) => item.id !== application.id));
  }

  return (
    <main className="mx-auto w-full max-w-7xl">
      <p className="text-sm font-medium text-primary">Review queue</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight">Professor applications</h1>
      <p className="mt-2 text-sm text-muted-foreground">Review applicants and grant the professor role after approval.</p>

      <div className="mt-8 bg-muted/20 p-3">
        <AdminTableToolbar query={query} onQueryChange={(value) => { setQuery(value); setPage(1); }} placeholder="Search applicants">
          <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className="h-9 bg-background px-3 text-sm text-foreground outline-none"><option value="all">All statuses</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select>
        </AdminTableToolbar>
      </div>
      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="text-xs uppercase tracking-[0.12em] text-muted-foreground"><tr className="border-b border-border/60"><th className="px-3 py-3 font-medium">Applicant</th><th className="px-3 py-3 font-medium">Focus</th><th className="px-3 py-3 font-medium">Background</th><th className="px-3 py-3 font-medium">Status</th><th className="px-3 py-3" /></tr></thead>
          <tbody className="divide-y divide-border/50">
            {loading ? <tr><td colSpan={5} className="py-16 text-center"><Loader2 className="mx-auto size-5 animate-spin text-muted-foreground" /></td></tr> : items.length === 0 ? <tr><td colSpan={5} className="py-16 text-center text-muted-foreground">No applications found.</td></tr> : items.map((item) => <tr key={item.id} className="hover:bg-muted/20"><td className="px-3 py-4"><p className="font-medium">{item.fullName}</p><p className="text-xs text-muted-foreground">{item.applicant.email} · {item.phone}</p></td><td className="max-w-xs px-3 py-4 text-xs text-muted-foreground">{item.categories.map(({ category }) => category.name).join(", ")}</td><td className="px-3 py-4 text-xs text-muted-foreground">{item.institution} · {item.qualification}</td><td className="px-3 py-4"><span className="bg-muted px-2 py-1 text-xs capitalize">{item.status}</span></td><td className="px-3 py-4 text-right">{item.status === "pending" ? <span className="inline-flex gap-1"><Button size="sm" onClick={() => void decide(item.id, "approved")}><Check className="size-4" /> Approve</Button><Button size="sm" variant="outline" onClick={() => void decide(item.id, "rejected")}><X className="size-4" /> Reject</Button></span> : <Button size="icon" variant="ghost" aria-label="Delete application" onClick={() => void removeApplication(item)}><Trash2 className="size-4 text-muted-foreground hover:text-destructive" /></Button>}</td></tr>)}
          </tbody>
        </table>
      </div>
      <div className="mt-5"><AdminPagination page={page} pageCount={pageCount} onPageChange={setPage} /></div>
    </main>
  );
}
