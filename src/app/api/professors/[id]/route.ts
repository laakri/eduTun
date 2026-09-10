import { auth } from "@/lib/auth";
import { requireUser } from "@/core/auth.service";
import { db } from "@/lib/db";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { ok, withErrorHandler } from "@/lib/api-response";
import { getBunnyStorageProxyUrl } from "@/lib/bunny";
import { z } from "zod";

function avatarUrlForClient(value: string | null) {
  if (!value) return null;
  if (value.includes("/api/media?")) return value;
  const key = value.match(
    /(profiles\/[a-z0-9]+\/avatar-[a-f0-9-]+\.(?:jpg|jpeg|png|webp))/i,
  )?.[1];
  return key ? getBunnyStorageProxyUrl(key) : null;
}

export const GET = withErrorHandler(
  async (_req, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const session = await auth();
    const professor = await db.user.findUnique({
      where: { id },
      select: {
        id: true,
        fullName: true,
        avatarUrl: true,
        createdAt: true,
        coursesTaught: {
          where: { published: true },
          orderBy: { updatedAt: "desc" },
          select: {
            id: true,
            title: true,
            description: true,
            categories: { include: { category: { select: { name: true } } } },
            chapters: {
              orderBy: { order: "asc" },
              select: {
                id: true,
                title: true,
                order: true,
                durationSeconds: true,
                videoStatus: true,
                _count: { select: { comments: true, votes: true } },
                votes: { select: { value: true } },
              },
            },
          },
        },
        professorRatings: { select: { rating: true } },
      },
    });

    if (!professor) throw new NotFoundError("Professor");

    const chapterCount = professor.coursesTaught.reduce(
      (total, course) => total + course.chapters.length,
      0,
    );
    const ratingTotal = professor.professorRatings.reduce(
      (total, rating) => total + rating.rating,
      0,
    );
    const averageRating = professor.professorRatings.length
      ? Number((ratingTotal / professor.professorRatings.length).toFixed(1))
      : null;

    const viewerRating = session?.user
      ? await db.professorRating.findUnique({
          where: {
            professorId_userId: {
              professorId: professor.id,
              userId: session.user.id,
            },
          },
          select: { rating: true },
        })
      : null;

    return ok({
      id: professor.id,
      fullName: professor.fullName,
      avatarUrl: avatarUrlForClient(professor.avatarUrl),
      memberSince: professor.createdAt,
      isAuthenticated: Boolean(session?.user),
      isOwner: session?.user?.id === professor.id,
      viewerRating: viewerRating?.rating ?? null,
      stats: {
        courseCount: professor.coursesTaught.length,
        chapterCount,
        ratingCount: professor.professorRatings.length,
        averageRating,
      },
      courses: professor.coursesTaught.map((course) => ({
        id: course.id,
        title: course.title,
        description: course.description,
        categories: course.categories.map(({ category }) => category.name),
        chapters: course.chapters.map((chapter) => ({
          id: chapter.id,
          title: chapter.title,
          order: chapter.order,
          durationSeconds: chapter.durationSeconds,
          videoStatus: chapter.videoStatus,
          score: chapter.votes.reduce((total, vote) => total + vote.value, 0),
          commentCount: chapter._count.comments,
        })),
      })),
    });
  },
);

export const POST = withErrorHandler(
  async (req, { params }: { params: Promise<{ id: string }> }) => {
    const user = await requireUser();
    const { id } = await params;
    const professor = await db.user.findUnique({
      where: { id },
      select: {
        id: true,
        coursesTaught: { where: { published: true }, select: { id: true } },
      },
    });
    if (!professor || professor.coursesTaught.length === 0) {
      throw new NotFoundError("Professor");
    }

    const input = z
      .object({ rating: z.number().int().min(1).max(5) })
      .parse(await req.json());
    if (user.id === id)
      throw new ValidationError("You cannot rate your own profile.");

    const rating = await db.professorRating.upsert({
      where: { professorId_userId: { professorId: id, userId: user.id } },
      update: { rating: input.rating },
      create: { professorId: id, userId: user.id, rating: input.rating },
    });
    return ok(rating);
  },
);
