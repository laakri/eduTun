"use client";

import { useEffect, useState } from "react";
import { Loader2, Trash2, UserRound } from "lucide-react";

import { AdminPagination, AdminTableToolbar } from "@/components/admin/AdminTableToolbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Person = {
  id: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  createdAt: string;
  courseCount: number;
  subscriptions: Array<{ plan: { name: string }; bacType: { name: string } | null; expiresAt: string }>;
};

export function PeopleTable({ role, title, description }: { role: "student" | "prof"; title: string; description: string }) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ items: Person[]; pageCount: number; total: number }>({ items: [], pageCount: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setLoading(true);
      fetch(`/api/admin/users?role=${role}&q=${encodeURIComponent(query)}&page=${page}`)
        .then(async (response) => {
          const json = await response.json();
          if (!response.ok) throw new Error(json.error?.message ?? "Could not load people.");
          setData(json.data);
          setError(null);
        })
        .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Could not load people."))
        .finally(() => setLoading(false));
    }, 220);
    return () => window.clearTimeout(timer);
  }, [page, query, role]);

  async function removePerson(person: Person) {
    if (!window.confirm(`Delete ${person.fullName}? This cannot be undone.`)) return;
    setDeleting(person.id);
    try {
      const response = await fetch(`/api/admin/users/${person.id}`, { method: "DELETE" });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error?.message ?? "Could not delete user.");
      setData((current) => ({ ...current, items: current.items.filter((item) => item.id !== person.id), total: current.total - 1 }));
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Could not delete user.");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <main className="mx-auto w-full max-w-7xl">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div><p className="text-sm font-medium text-primary">Directory</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">{title}</h1><p className="mt-2 text-sm text-muted-foreground">{description}</p></div>
        <span className="text-xs text-muted-foreground">{data.total} records</span>
      </div>
      <div className="mt-8 bg-muted/20 p-3"><AdminTableToolbar query={query} onQueryChange={(value) => { setQuery(value); setPage(1); }} placeholder={`Search ${role === "prof" ? "professors" : "students"}...`} /></div>
      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
      <div className="mt-4 overflow-x-auto bg-background">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="text-xs uppercase tracking-[0.12em] text-muted-foreground"><tr className="border-b border-border/60"><th className="px-3 py-3 font-medium">Person</th><th className="px-3 py-3 font-medium">Access</th><th className="px-3 py-3 font-medium">Details</th><th className="w-12 px-3 py-3" /></tr></thead>
          <tbody className="divide-y divide-border/50">
            {loading ? <tr><td colSpan={4} className="py-16 text-center"><Loader2 className="mx-auto size-5 animate-spin text-muted-foreground" /></td></tr> : data.items.length === 0 ? <tr><td colSpan={4} className="py-16 text-center text-muted-foreground">No people found.</td></tr> : data.items.map((person) => <tr key={person.id} className="group hover:bg-muted/20"><td className="px-3 py-4"><div className="flex items-center gap-3"><div className="flex size-9 items-center justify-center bg-primary/10 text-primary"><UserRound className="size-4" /></div><div><p className="font-medium">{person.fullName}</p><p className="text-xs text-muted-foreground">{person.email}</p></div></div></td><td className="px-3 py-4">{person.subscriptions[0] ? <Badge variant="secondary" className="font-normal">{person.subscriptions[0].bacType?.name ?? person.subscriptions[0].plan.name}</Badge> : <span className="text-muted-foreground">No active access</span>}</td><td className="px-3 py-4 text-xs text-muted-foreground">{role === "prof" ? `${person.courseCount} published courses` : person.subscriptions[0] ? `Until ${new Date(person.subscriptions[0].expiresAt).toLocaleDateString()}` : `Joined ${new Date(person.createdAt).toLocaleDateString()}`}</td><td className="px-3 py-4 text-right"><Button variant="ghost" size="icon" aria-label={`Actions for ${person.fullName}`} disabled={deleting === person.id} onClick={() => void removePerson(person)}><Trash2 className="size-4 text-muted-foreground hover:text-destructive" /></Button></td></tr>)}
          </tbody>
        </table>
      </div>
      <div className="mt-5"><AdminPagination page={page} pageCount={data.pageCount} onPageChange={setPage} /></div>
    </main>
  );
}