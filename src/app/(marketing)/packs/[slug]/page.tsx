"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, BookOpen, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type Pack = { name: string; description: string | null; priceCents: number; items: Array<{ category: { id: string; name: string; children: Array<{ id: string; name: string }> } | null; course: { id: string; title: string; description: string | null; published: boolean } | null }> };

export default function PackDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const [pack, setPack] = useState<Pack | null>(null); const [error, setError] = useState<string | null>(null);
  useEffect(() => { params.then(({ slug }) => fetch(`/api/packs/${slug}`).then(async (res) => { const json = await res.json(); if (!res.ok) throw new Error(json.error?.message || "Pack not found"); setPack(json.data); }).catch((e) => setError(e.message))); }, [params]);
  if (error) return <main className="mx-auto max-w-4xl px-6 py-16"><Link href="/packs" className="text-sm underline">Back to packs</Link><h1 className="mt-6 text-2xl font-semibold">{error}</h1></main>;
  if (!pack) return <main className="flex min-h-[60svh] items-center justify-center"><Loader2 className="animate-spin" /></main>;
  return <main className="mx-auto max-w-4xl px-6 py-12"><Link href="/packs" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4"/>All packs</Link><div className="mt-8 rounded-2xl bg-muted p-8"><p className="text-sm font-medium text-primary">STUDY PACK</p><h1 className="mt-2 text-3xl font-bold">{pack.name}</h1><p className="mt-3 max-w-2xl text-muted-foreground">{pack.description}</p><p className="mt-6 font-semibold">{pack.priceCents === 0 ? "Included with the test account" : `${(pack.priceCents / 100).toFixed(2)} TND`}</p></div><section className="mt-10"><h2 className="text-xl font-semibold">What&apos;s included</h2><div className="mt-4 grid gap-3 sm:grid-cols-2">{pack.items.map((item, index) => item.category ? <Card key={item.category.id} className="p-5"><BookOpen className="size-4 text-primary"/><h3 className="mt-3 font-medium">{item.category.name}</h3><p className="mt-1 text-sm text-muted-foreground">{item.category.children.map((child) => child.name).join(" · ") || "Courses added by your teachers"}</p></Card> : item.course ? <Card key={item.course.id} className="p-5"><h3 className="font-medium">{item.course.title}</h3><p className="mt-1 text-sm text-muted-foreground">{item.course.description}</p>{item.course.published && <Button asChild className="mt-4" size="sm"><Link href={`/learn/${item.course.id}`}>Open course</Link></Button>}</Card> : <Card key={index} />)}</div></section></main>;
}
