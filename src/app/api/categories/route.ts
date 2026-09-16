import { db } from "@/lib/db";
import { ok, withErrorHandler } from "@/lib/api-response";

// Open to everyone — reading the category tree isn't sensitive.
// This is the canonical read endpoint; /api/admin/categories now
// only handles the admin-only write (POST).
export const GET = withErrorHandler(async () => {
  const bacRoot = await db.category.findUnique({
    where: { slug: "bac" },
    include: {
      parentLinks: {
        orderBy: { order: "asc" },
        include: { child: { select: { id: true, name: true, slug: true } } },
      },
    },
  });

  if (!bacRoot) {
    return ok([]);
  }

  const tree = [{
    id: bacRoot.id,
    name: bacRoot.name,
    slug: bacRoot.slug,
    parentId: null,
    children: bacRoot.parentLinks.map((link) => ({
      id: link.child.id,
      name: link.child.name,
      slug: link.child.slug,
      parentId: bacRoot.id,
      children: [],
    })),
  }];

  return ok(tree);
});
