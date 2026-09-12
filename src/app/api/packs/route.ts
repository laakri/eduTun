import { db } from "@/lib/db";
import { ok, withErrorHandler } from "@/lib/api-response";

/** Public catalog metadata only; protected course playback stays private. */
export const GET = withErrorHandler(async () => {
  const packs = await db.pack.findMany({
    include: {
      items: {
        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
              parentLinks: { select: { parentId: true } },
            },
          },
          course: { select: { id: true, title: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return ok(
    packs.map((pack) => ({
      ...pack,
      items: pack.items.map((item) => ({
        ...item,
        category: item.category
          ? {
              ...item.category,
              parentId: item.category.parentLinks[0]?.parentId ?? null,
            }
          : null,
      })),
    })),
  );
});
