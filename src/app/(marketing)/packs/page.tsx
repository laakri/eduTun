"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Check, Layers, PackageOpen, ShoppingCart, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useCart } from "@/components/cart-provider";

// Same token set as the course catalog page — move to a shared file
// (e.g. lib/theme.ts) once both are wired up, so they can't drift apart.
const tokens = {
  ink: "#132821",
  ink60: "rgba(19,40,33,0.62)",
  paper: "#FAF8F2",
  moss: "#24463A",
  mossSoft: "#EEF2ED",
  brass: "#A9823C",
  brassSoft: "#F4ECDA",
  line: "#E4E0D3",
  card: "#FFFFFF",
};

type Pack = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  priceCents: number;
  featured?: boolean; // optional today — add a `featured` column on Pack when ready
  items: Array<{
    category: { name: string } | null;
    course: { title: string } | null;
  }>;
};

// Until the API returns a real `featured` flag, fall back to picking the
// pack by name so the banner still shows up for the seeded data.
function findFeatured(packs: Pack[]) {
  return (
    packs.find((p) => p.featured) ??
    packs.find((p) => /foundation/i.test(p.name)) ??
    null
  );
}

// A small decorative mark for the featured banner — a diploma/seal motif
// built from primitives so it stays crisp and on-brand instead of a stock
// photo. Purely illustrative, no external asset needed.
function DiplomaMark() {
  return (
    <svg
      viewBox="0 0 220 220"
      className="h-40 w-40 sm:h-48 sm:w-48"
      aria-hidden="true"
    >
      <circle
        cx="110"
        cy="110"
        r="96"
        fill="none"
        stroke="rgba(244,236,218,0.18)"
        strokeWidth="1"
      />
      <circle
        cx="110"
        cy="110"
        r="76"
        fill="none"
        stroke="rgba(244,236,218,0.28)"
        strokeWidth="1"
      />
      <circle cx="110" cy="88" r="46" fill="#F4ECDA" />
      <path d="M62 96 L110 78 L158 96 L110 114 Z" fill="#A9823C" />
      <path
        d="M78 103 V128 C78 138 96 146 110 146 C124 146 142 138 142 128 V103"
        fill="none"
        stroke="#A9823C"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <line
        x1="158"
        y1="96"
        x2="158"
        y2="122"
        stroke="#A9823C"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="158" cy="127" r="3.5" fill="#A9823C" />
      <path
        d="M84 158 L110 172 L136 158 L136 188 L110 202 L84 188 Z"
        fill="#F4ECDA"
        opacity="0.95"
      />
    </svg>
  );
}

function itemLabel(item: Pack["items"][number]) {
  return item.category?.name ?? item.course?.title ?? null;
}

function formatPrice(priceCents: number) {
  if (priceCents === 0) return "Included for testing";
  return `${(priceCents / 100).toFixed(2)} TND`;
}

export default function PacksPage() {
  const [packs, setPacks] = useState<Pack[]>([]);
  const [loading, setLoading] = useState(true);
  const cart = useCart();

  function addToCart(pack: Pack) {
    cart.addItem({
      id: pack.id,
      slug: pack.slug,
      name: pack.name,
      priceCents: pack.priceCents,
    });
  }

  useEffect(() => {
    fetch("/api/packs")
      .then((res) => res.json())
      .then((json) => setPacks(json.data ?? []))
      .finally(() => setLoading(false));
  }, []);

  const featuredPack = findFeatured(packs);
  const gridPacks = featuredPack
    ? packs.filter((p) => p.id !== featuredPack.id)
    : packs;

  return (
    <main
      className="min-h-[calc(100svh-56px)]"
      style={{ backgroundColor: tokens.paper, color: tokens.ink }}
    >
      <div className="mx-auto max-w-6xl px-6 py-14">
        <p className="text-sm" style={{ color: tokens.brass }}>
          Study packs
        </p>
        <h1 className="mt-2 max-w-2xl text-3xl font-semibold leading-tight sm:text-4xl">
          A learning path for every goal
        </h1>
        <p
          className="mt-3 max-w-2xl text-[15px] leading-relaxed"
          style={{ color: tokens.ink60 }}
        >
          Each pack bundles the subjects and courses you need for a specific
          goal. Browse freely — lessons unlock once the pack is in your account.
        </p>

        {loading ? (
          <>
            <div
              className="mt-10 h-56 animate-pulse rounded-xl"
              style={{ backgroundColor: tokens.line }}
            />
            <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="flex min-h-64 flex-col rounded-lg border p-6"
                  style={{
                    borderColor: tokens.line,
                    backgroundColor: tokens.card,
                  }}
                >
                  <div
                    className="h-3 w-20 animate-pulse rounded"
                    style={{ backgroundColor: tokens.line }}
                  />
                  <div
                    className="mt-5 h-5 w-3/4 animate-pulse rounded"
                    style={{ backgroundColor: tokens.line }}
                  />
                  <div
                    className="mt-3 h-3 w-full animate-pulse rounded"
                    style={{ backgroundColor: tokens.line }}
                  />
                  <div
                    className="mt-2 h-3 w-5/6 animate-pulse rounded"
                    style={{ backgroundColor: tokens.line }}
                  />
                  <div
                    className="mt-auto pt-8 h-9 w-full animate-pulse rounded"
                    style={{ backgroundColor: tokens.line }}
                  />
                </div>
              ))}
            </div>
          </>
        ) : packs.length === 0 ? (
          <div
            className="mt-10 flex flex-col items-center gap-3 rounded-lg border border-dashed p-14 text-center"
            style={{ borderColor: tokens.line, color: tokens.ink60 }}
          >
            <PackageOpen className="h-6 w-6" />
            <p className="text-sm">
              No packs are available yet. Check back soon.
            </p>
          </div>
        ) : (
          <>
            {featuredPack && (
              <div
                className="relative mt-10 overflow-hidden rounded-xl"
                style={{ backgroundColor: tokens.moss }}
              >
                {/* faint dot texture behind the copy — subtle, not a gradient wash */}
                <div
                  className="absolute inset-0 opacity-[0.15]"
                  style={{
                    backgroundImage:
                      "radial-gradient(rgba(244,236,218,0.6) 1px, transparent 1px)",
                    backgroundSize: "16px 16px",
                  }}
                />
                <div className="relative flex flex-col items-start gap-8 p-8 sm:flex-row sm:items-center sm:justify-between sm:p-10">
                  <div className="max-w-lg">
                    <div
                      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
                      style={{
                        backgroundColor: "rgba(244,236,218,0.14)",
                        color: tokens.brassSoft,
                      }}
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      Featured pack
                    </div>
                    <h2 className="mt-4 text-2xl font-semibold text-white sm:text-3xl">
                      {featuredPack.name}
                    </h2>
                    <p
                      className="mt-2 text-[15px] leading-relaxed"
                      style={{ color: "rgba(250,248,242,0.75)" }}
                    >
                      {featuredPack.description ||
                        "A structured collection of courses and subjects."}
                    </p>

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      {(
                        featuredPack.items
                          .map(itemLabel)
                          .filter(Boolean) as string[]
                      )
                        .slice(0, 4)
                        .map((label) => (
                          <span
                            key={label}
                            className="rounded-full px-2.5 py-1 text-xs"
                            style={{
                              backgroundColor: "rgba(244,236,218,0.14)",
                              color: tokens.brassSoft,
                            }}
                          >
                            {label}
                          </span>
                        ))}
                    </div>

                    <div className="mt-6 flex items-center gap-4">
                      <Button
                        style={{
                          backgroundColor: tokens.brassSoft,
                          color: tokens.ink,
                        }}
                        onClick={() => addToCart(featuredPack)}
                      >
                        <ShoppingCart className="h-3.5 w-3.5" />
                        Add to cart
                      </Button>
                      <span className="text-sm font-medium text-white">
                        {formatPrice(featuredPack.priceCents)}
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0 self-center opacity-95">
                    <DiplomaMark />
                  </div>
                </div>
              </div>
            )}

            {gridPacks.length > 0 && (
              <p
                className="mt-10 text-sm font-medium"
                style={{ color: tokens.ink60 }}
              >
                {featuredPack ? "Other packs" : "All packs"}
              </p>
            )}
            <div
              className={`grid gap-5 md:grid-cols-2 lg:grid-cols-3 ${gridPacks.length > 0 ? "mt-4" : "mt-10"}`}
            >
              {gridPacks.map((pack) => {
                const labels = pack.items
                  .map(itemLabel)
                  .filter(Boolean) as string[];
                const shown = labels.slice(0, 4);
                const extra = labels.length - shown.length;

                return (
                  <Card
                    key={pack.id}
                    className="flex h-full min-h-64 flex-col rounded-lg p-6 transition-colors"
                    style={{
                      borderColor: tokens.line,
                      backgroundColor: tokens.card,
                    }}
                  >
                    <div
                      className="flex items-center gap-2 text-xs"
                      style={{ color: tokens.ink60 }}
                    >
                      <Layers
                        className="h-3.5 w-3.5"
                        style={{ color: tokens.brass }}
                      />
                      {labels.length} subject{labels.length === 1 ? "" : "s"}{" "}
                      included
                    </div>

                    <h2 className="mt-3 text-xl font-semibold leading-snug">
                      {pack.name}
                    </h2>
                    <p
                      className="mt-2 text-sm leading-relaxed"
                      style={{ color: tokens.ink60 }}
                    >
                      {pack.description ||
                        "A structured collection of courses and subjects."}
                    </p>

                    {shown.length > 0 && (
                      <ul className="mt-4 space-y-1.5">
                        {shown.map((label) => (
                          <li
                            key={label}
                            className="flex items-start gap-2 text-sm"
                          >
                            <Check
                              className="mt-0.5 h-3.5 w-3.5 shrink-0"
                              style={{ color: tokens.brass }}
                            />
                            <span className="truncate">{label}</span>
                          </li>
                        ))}
                        {extra > 0 && (
                          <li
                            className="pl-5 text-xs"
                            style={{ color: tokens.ink60 }}
                          >
                            +{extra} more
                          </li>
                        )}
                      </ul>
                    )}

                    <div
                      className="mt-auto flex items-center justify-between border-t pt-5"
                      style={{ borderColor: tokens.line }}
                    >
                      <span className="font-semibold">
                        {formatPrice(pack.priceCents)}
                      </span>
                      <Button
                        size="sm"
                        style={{ backgroundColor: tokens.moss, color: "white" }}
                        onClick={() => addToCart(pack)}
                      >
                        <ShoppingCart className="h-3.5 w-3.5" />
                        Add to cart
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
