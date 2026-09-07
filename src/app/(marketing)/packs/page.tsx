"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, BookOpen, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type Pack = { id: string; slug: string; name: string; description: string | null; priceCents: number; items: Array<{ category: { name: string } | null; course: { title: string } | null }> };

export default function PacksPage() {
  const [packs, setPacks] = useState<Pack[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { fetch("/api/packs").then((res) => res.json()).then((json) => setPacks(json.data ?? [])).finally(() => setLoading(false)); }, []);

  return <main className="mx-auto min-h-[calc(100svh-56px)] max-w-6xl px-6 py-14">
    <p className="text-sm font-medium text-primary">STUDY PACKS</p>
    <h1 className="mt-2 text-3xl font-bold tracking-tight">Choose your learning path</h1>
    <p className="mt-3 max-w-2xl text-muted-foreground">Each pack organizes the subjects and courses you need. Browse freely; lessons open only after the pack is in your account.</p>
    {loading ? <div className="flex justify-center py-20"><Loader2 className="animate-spin text-muted-foreground" /></div> : packs.length === 0 ? <Card className="mt-10 p-8 text-center text-muted-foreground">No packs are available yet.</Card> : <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
      {packs.map((pack) => <Card key={pack.id} className="flex min-h-64 flex-col p-6">
        <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary"><BookOpen className="size-5" /></div>
        <h2 className="mt-5 text-xl font-semibold">{pack.name}</h2>
        <p className="mt-2 flex-1 text-sm leading-6 text-muted-foreground">{pack.description || "A structured collection of courses and subjects."}</p>
        <p className="mt-4 text-xs text-muted-foreground">{pack.items.map((item) => item.category?.name || item.course?.title).filter(Boolean).join(" · ")}</p>
        <div className="mt-5 flex items-center justify-between"><span className="font-semibold">{pack.priceCents === 0 ? "Included for testing" : `${(pack.priceCents / 100).toFixed(2)} TND`}</span><Button asChild size="sm"><Link href={`/packs/${pack.slug}`}>View pack <ArrowRight className="size-4" /></Link></Button></div>
      </Card>)}
    </div>}
  </main>;
}
