import { db } from "@/lib/db";
import { ok, withErrorHandler } from "@/lib/api-response";

// Open to everyone — reading the category tree isn't sensitive.
// This is the canonical read endpoint; /api/admin/categories now
// only handles the admin-only write (POST).
export const GET = withErrorHandler(async () => {
  const categories = await db.category.findMany({
    include: {
      parentLinks: {
        orderBy: { order: "asc" },
        include: { parent: { select: { id: true, name: true, slug: true } } },
      },
      childLinks: {
        orderBy: { order: "asc" },
        include: { child: { select: { id: true, name: true, slug: true } } },
      },
    },
  });

  const parentMap = new Map<string, Array<{ id: string; name: string; slug: string; parentId: string }>>();
  for (const category of categories) {
    for (const link of category.childLinks) {
      const child = {
        id: link.child.id,
        name: link.child.name,
        slug: link.child.slug,
        parentId: category.id,
      };
      const bucket = parentMap.get(category.id) ?? [];
      bucket.push(child);
      parentMap.set(category.id, bucket);
    }
  }

  const tree = categories
    .filter((category) => category.parentLinks.length === 0)
    .map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      parentId: null,
      children: (parentMap.get(category.id) ?? []).map((child) => ({
        id: child.id,
        name: child.name,
        slug: child.slug,
        parentId: child.parentId,
        children: [],
      })),
    }));

  return ok(tree);
});
