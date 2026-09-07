import { db } from "@/lib/db";
import { ok, withErrorHandler } from "@/lib/api-response";

// Open to everyone — reading the category tree isn't sensitive.
// This is the canonical read endpoint; /api/admin/categories now
// only handles the admin-only write (POST).
export const GET = withErrorHandler(async () => {
  const categories = await db.category.findMany({
    where: { parentId: null },
    include: { children: true },
  });
  return ok(categories);
});
