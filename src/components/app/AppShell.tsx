// components/app/AppShell.tsx
"use client";

export function AppShell({ children }: {
  children: React.ReactNode;
  user?: {
    name?: string | null;
    email?: string | null;
    roles?: string[];
  };
}) {
  return (
    <div className="flex min-h-svh w-full flex-col bg-background text-foreground">
      <main className="min-w-0 flex-1 px-6 py-6">{children}</main>
    </div>
  );
}
