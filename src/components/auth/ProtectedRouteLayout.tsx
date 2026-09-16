import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";

export default async function ProtectedRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/register?mode=login");
  }

  return children;
}
