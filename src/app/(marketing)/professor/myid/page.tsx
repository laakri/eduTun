import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";

export default async function MyProfessorProfilePage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/register?mode=login");
  }

  redirect(`/professors/${session.user.id}`);
}