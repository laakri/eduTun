"use client";

import { createContext, useContext, useState } from "react";

const ToastContext = createContext<(message: string) => void>(() => undefined);

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);

  function showToast(nextMessage: string) {
    setMessage(nextMessage);
    window.setTimeout(() => setMessage((current) => current === nextMessage ? null : current), 2800);
  }

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      {message && (
        <div role="status" className="fixed bottom-5 right-5 z-[100] rounded-md border border-border bg-background px-4 py-3 text-sm font-medium text-foreground shadow-lg">
          {message}
        </div>
      )}
    </ToastContext.Provider>
  );
}
