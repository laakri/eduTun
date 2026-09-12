"use client";

import { SessionProvider } from "next-auth/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

import { TooltipProvider } from "@/components/ui/tooltip";
import { ToastProvider } from "@/components/toast-provider";

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <ToastProvider>{children}</ToastProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
}
