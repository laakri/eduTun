import { redirect } from "next/navigation";

export default async function PackLegacyRedirectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await params;
  redirect("/packs");
}
