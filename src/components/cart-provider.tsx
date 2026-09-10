"use client";

import Link from "next/link";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Check, ShoppingCart, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export type CartPack = {
  id: string;
  slug: string;
  name: string;
  priceCents: number;
  categoryIds: string[];
  categoryParents: Record<string, string | null>;
};

type CartContextValue = {
  items: CartPack[];
  isOpen: boolean;
  addItem: (pack: CartPack) => void;
  removeItem: (packId: string) => void;
  clear: () => void;
  open: () => void;
  close: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

function formatPrice(priceCents: number) {
  return priceCents === 0 ? "Free" : `${(priceCents / 100).toFixed(2)} TND`;
}

function hasCategoryOverlap(first: CartPack, second: CartPack) {
  const parents = {
    ...(first.categoryParents ?? {}),
    ...(second.categoryParents ?? {}),
  };

  function isAncestor(ancestorId: string, categoryId: string) {
    let currentId = parents[categoryId] ?? null;
    const visited = new Set<string>();
    while (currentId && !visited.has(currentId)) {
      if (currentId === ancestorId) return true;
      visited.add(currentId);
      currentId = parents[currentId] ?? null;
    }
    return false;
  }

  return (first.categoryIds ?? []).some((firstCategoryId) =>
    (second.categoryIds ?? []).some(
      (secondCategoryId) =>
        firstCategoryId === secondCategoryId ||
        isAncestor(firstCategoryId, secondCategoryId) ||
        isAncestor(secondCategoryId, firstCategoryId),
    ),
  );
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartPack[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const stored = window.localStorage.getItem("edutun-cart");
      if (!stored) return [];
      const parsed = JSON.parse(stored) as CartPack[];
      return parsed.filter(
        (item) =>
          Array.isArray(item.categoryIds) &&
          item.categoryParents &&
          typeof item.categoryParents === "object",
      );
    } catch {
      window.localStorage.removeItem("edutun-cart");
      return [];
    }
  });
  const [isOpen, setIsOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    window.localStorage.setItem("edutun-cart", JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  function addItem(pack: CartPack) {
    setItems((current) => {
      if (current.some((item) => item.id === pack.id)) {
        setToast(`${pack.name} is already in your cart.`);
        return current;
      }

      const conflict = current.find((item) => {
        return hasCategoryOverlap(pack, item);
      });

      if (conflict) {
        setToast(
          `${pack.name} overlaps with ${conflict.name}. Choose one pack so you are not charged twice.`,
        );
        return current;
      }

      setToast(`${pack.name} added to your cart.`);
      return [...current, pack];
    });
  }

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      isOpen,
      addItem,
      removeItem: (packId) =>
        setItems((current) => {
          const removed = current.find((item) => item.id === packId);
          if (removed)
            setToast(`${removed.name} removed. You can add it again.`);
          return current.filter((item) => item.id !== packId);
        }),
      clear: () => setItems([]),
      open: () => setIsOpen(true),
      close: () => setIsOpen(false),
    }),
    [isOpen, items],
  );

  return (
    <CartContext.Provider value={value}>
      {children}
      {toast && (
        <div className="fixed bottom-5 left-1/2 z-[100] flex -translate-x-1/2 items-center gap-2 rounded-lg border bg-popover px-4 py-3 text-sm text-popover-foreground shadow-lg">
          <Check className="size-4 text-primary" />
          {toast}
          <button
            type="button"
            onClick={() => setToast(null)}
            aria-label="Dismiss notification"
          >
            <X className="size-3.5 text-muted-foreground" />
          </button>
        </div>
      )}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <ShoppingCart className="size-4" />
              Your cart
            </SheetTitle>
            <SheetDescription>
              {items.length === 0
                ? "Your selected packs will appear here."
                : `${items.length} pack${items.length === 1 ? "" : "s"} selected`}
            </SheetDescription>
          </SheetHeader>

          {items.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center text-sm text-muted-foreground">
              <ShoppingCart className="size-8 opacity-40" />
              <p>Choose a pack to start building your learning path.</p>
              <Button
                asChild
                variant="outline"
                onClick={() => setIsOpen(false)}
              >
                <Link href="/packs">Browse packs</Link>
              </Button>
            </div>
          ) : (
            <div className="flex-1 space-y-2 overflow-y-auto px-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-lg bg-muted p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{item.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatPrice(item.priceCents)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => value.removeItem(item.id)}
                    aria-label={`Remove ${item.name}`}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {items.length > 0 && (
            <CartCheckout items={items} onComplete={value.clear} />
          )}
          <SheetFooter />
        </SheetContent>
      </Sheet>
    </CartContext.Provider>
  );
}

function CartCheckout({
  items,
  onComplete,
}: {
  items: CartPack[];
  onComplete: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function checkout() {
    setBusy(true);
    setError(null);
    try {
      for (const item of items) {
        const response = await fetch(`/api/packs/${item.slug}/enroll`, {
          method: "POST",
        });
        if (!response.ok) {
          const json = await response.json().catch(() => null);
          throw new Error(
            json?.error?.message ?? "Could not complete this purchase.",
          );
        }
      }
      onComplete();
      window.location.href = "/learn";
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Could not complete this purchase.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border-t px-4 pt-4">
      {error && <p className="mb-3 text-xs text-destructive">{error}</p>}
      <Button className="w-full" onClick={checkout} disabled={busy}>
        {busy ? "Completing purchase..." : "Complete purchase"}
      </Button>
    </div>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside CartProvider");
  return context;
}
