import { db } from "@/lib/db";
import { ok, withErrorHandler } from "@/lib/api-response";
import { getBunnyStorageProxyUrl } from "@/lib/bunny";

function avatarUrlForClient(value: string | null) {
  if (!value || value.includes("/api/media?")) return value;
  const key = value.match(
    /(profiles\/[a-z0-9]+\/avatar-[a-f0-9-]+\.(?:jpg|jpeg|png|webp))/i,
  )?.[1];
  return key ? getBunnyStorageProxyUrl(key) : null;
}

export const GET = withErrorHandler(async (req) => {
  const query = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (query.length < 2) return ok([]);

  const professors = await db.user.findMany({
    where: {
      fullName: { contains: query, mode: "insensitive" },
      coursesTaught: { some: { published: true } },
    },
    select: {
      id: true,
      fullName: true,
      avatarUrl: true,
      _count: { select: { coursesTaught: true } },
    },
    orderBy: { fullName: "asc" },
    take: 5,
  });

  return ok(
    professors.map((professor) => ({
      id: professor.id,
      fullName: professor.fullName,
      avatarUrl: avatarUrlForClient(professor.avatarUrl),
      courseCount: professor._count.coursesTaught,
    })),
  );
});