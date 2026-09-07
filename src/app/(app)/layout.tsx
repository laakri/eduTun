import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { AppShell } from "@/components/app/AppShell";
import { canManageCourses } from "@/core/permissions";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/");
  }

  // This route group is the professor/admin workspace only. Students stay in
  // the public pack experience and never inherit the management sidebar.
  if (!canManageCourses(session.user.roles)) {
    redirect("/packs");
  }

  return <AppShell user={session.user}>{children}</AppShell>;
}
