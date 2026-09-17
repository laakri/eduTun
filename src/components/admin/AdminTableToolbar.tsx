"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export function AdminTableToolbar({
  query,
  onQueryChange,
  placeholder = "Search...",
  children,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  placeholder?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative min-w-0 flex-1 sm:max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder={placeholder} className="h-9 border-0 bg-muted/50 pl-9 shadow-none" />
      </div>
      {children}
    </div>
  );
}

export function AdminPagination({ page, pageCount, onPageChange }: { page: number; pageCount: number; onPageChange: (page: number) => void }) {
  return (
    <div className="flex items-center justify-between text-xs text-muted-foreground">
      <span>Page {page} of {Math.max(pageCount, 1)}</span>
      <div className="flex gap-1">
        <button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)} className="px-2.5 py-1.5 hover:bg-muted disabled:opacity-40">Previous</button>
        <button type="button" disabled={page >= pageCount} onClick={() => onPageChange(page + 1)} className="px-2.5 py-1.5 hover:bg-muted disabled:opacity-40">Next</button>
      </div>
    </div>
  );
}