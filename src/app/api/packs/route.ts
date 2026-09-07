import { db } from "@/lib/db";
import { ok, withErrorHandler } from "@/lib/api-response";

/** Public catalog metadata only; protected course playback stays private. */
export const GET = withErrorHandler(async () => {
  const packs = await db.pack.findMany({
    include: { items: { include: { category: { select: { id: true, name: true, slug: true } }, course: { select: { id: true, title: true } } } } },
    orderBy: { createdAt: "desc" },
  });
  return ok(packs);
});
