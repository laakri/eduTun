import { z } from "zod";
import { auth } from "@/lib/auth";
import { requireUser } from "@/core/auth.service";
import { canEditCourse } from "@/core/permissions";
import { hasCourseAccess } from "@/lib/content-access";
import { db } from "@/lib/db";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { ok, withErrorHandler } from "@/lib/api-response";

const feedbackSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("vote"),
    value: z.union([z.literal(-1), z.literal(1)]),
  }),
  z.object({
    type: z.literal("comment"),
    body: z.string().trim().min(1).max(1000),
  }),
]);

export const GET = withErrorHandler(
  async (_req, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const session = await auth();
    const chapter = await db.chapter.findUnique({
      where: { id },
    });
    if (!chapter) throw new NotFoundError("Chapter");

    const [comments, votes, viewerVote] = await Promise.all([
      db.chapterComment.findMany({
        where: { chapterId: id },
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { user: { select: { fullName: true, avatarUrl: true } } },
      }),
      db.chapterVote.findMany({
        where: { chapterId: id },
        select: { value: true },
      }),
      session?.user
        ? db.chapterVote.findUnique({
            where: {
              chapterId_userId: { chapterId: id, userId: session.user.id },
            },
            select: { value: true },
          })
        : null,
    ]);

    return ok({
      score: votes.reduce((total, vote) => total + vote.value, 0),
      viewerVote: viewerVote?.value ?? 0,
      comments: comments.map((comment) => ({
        id: comment.id,
        body: comment.body,
        createdAt: comment.createdAt,
        user: comment.user,
      })),
    });
  },
);

export const POST = withErrorHandler(
  async (req, { params }: { params: Promise<{ id: string }> }) => {
    const user = await requireUser();
    const { id } = await params;
    const chapter = await db.chapter.findUnique({
      where: { id },
      include: { course: true },
    });
    if (!chapter) throw new NotFoundError("Chapter");
    if (
      !canEditCourse(user, chapter.course) &&
      !(await hasCourseAccess(user.id, chapter.courseId))
    ) {
      throw new ValidationError(
        "Unlock this course before joining the discussion.",
      );
    }
    const body = feedbackSchema.parse(await req.json());

    if (body.type === "vote") {
      const vote = await db.chapterVote.upsert({
        where: { chapterId_userId: { chapterId: id, userId: user.id } },
        update: { value: body.value },
        create: { chapterId: id, userId: user.id, value: body.value },
      });
      return ok({ type: "vote", value: vote.value });
    }

    if (!body.body) throw new ValidationError("Comment cannot be empty.");
    const comment = await db.chapterComment.create({
      data: { chapterId: id, userId: user.id, body: body.body },
      include: { user: { select: { fullName: true, avatarUrl: true } } },
    });
    return ok({ type: "comment", comment }, 201);
  },
);
