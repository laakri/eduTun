import { z } from "zod";
import { db } from "@/lib/db";
import { ok, withErrorHandler } from "@/lib/api-response";
import { parseBody } from "@/lib/parse-body";
import { requireRole } from "@/core/auth.service";

const createCategorySchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  parentId: z.string().cuid().optional(),
});

// Only "admin" role can create categories — this is the real enforcement
// point. Never rely on hiding a button in the UI as your only protection.
export const POST = withErrorHandler(async (req) => {
  await requireRole("admin");

  const body = await parseBody(req, createCategorySchema);

  if (body.parentId) {
    const parent = await db.category.findUnique({
      where: { id: body.parentId },
      select: { id: true },
    });
    if (!parent) throw new Error("Parent category not found.");
  }

  const category = await db.category.create({
    data: {
      slug: body.slug,
      name: body.name,
    },
  });

  if (body.parentId) {
    await db.categoryRelation.create({
      data: {
        parentId: body.parentId,
        childId: category.id,
      },
    });
  }

  return ok(category, 201);
});

// Reading categories happens through /api/categories (public, no admin
// gate) — this file is admin-write-only now to avoid two routes doing
// the same GET with different permission stories.
