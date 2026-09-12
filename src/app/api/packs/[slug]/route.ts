import { db } from "@/lib/db";
import { NotFoundError } from "@/lib/errors";
import { ok, withErrorHandler } from "@/lib/api-response";

export const GET = withErrorHandler(
  async (_req, { params }: { params: Promise<{ slug: string }> }) => {
    const { slug } = await params;
    const pack = await db.pack.findUnique({
      where: { slug },
      include: {
        items: {
          include: {
            category: {
              select: {
                id: true,
                name: true,
                slug: true,
                parentLinks: { select: { parentId: true } },
                childLinks: { select: { childId: true, child: { select: { id: true, name: true, slug: true } } } },
              },
            },
            course: {
              select: {
                id: true,
                title: true,
                description: true,
                published: true,
              },
            },
          },
        },
      },
    });
    if (!pack) throw new NotFoundError("Pack");

    return ok({
      ...pack,
      items: pack.items.map((item) => ({
        ...item,
        category: item.category
          ? {
              ...item.category,
              parentId: item.category.parentLinks[0]?.parentId ?? null,
              children: item.category.childLinks.map((link) => link.child),
            }
          : null,
      })),
    });
  },
);
