import { z } from "zod";

import { assertCanEditCourse } from "@/core/auth.service";
import { db } from "@/lib/db";
import { NotFoundError } from "@/lib/errors";
import { ok, withErrorHandler } from "@/lib/api-response";

const answerSchema = z.object({ text: z.string().min(1).max(500), isCorrect: z.boolean() });
const questionSchema = z.object({ prompt: z.string().min(1).max(1000), answers: z.array(answerSchema).min(2).max(6) });
const quizSchema = z.object({ title: z.string().min(1).max(160), questions: z.array(questionSchema).max(50) });

async function getChapter(id: string) {
  const chapter = await db.chapter.findUnique({ where: { id }, include: { course: true } });
  if (!chapter) throw new NotFoundError("Chapter");
  await assertCanEditCourse(chapter.course);
  return chapter;
}

export const GET = withErrorHandler(async (_req, { params }: { params: Promise<{ id: string }> }) => {
  const chapter = await getChapter((await params).id);
  const quiz = await db.quiz.findUnique({ where: { chapterId: chapter.id }, include: { questions: { orderBy: { order: "asc" }, include: { answers: true } } } });
  return ok(quiz);
});

export const PUT = withErrorHandler(async (req, { params }: { params: Promise<{ id: string }> }) => {
  const chapter = await getChapter((await params).id);
  const body = quizSchema.parse(await req.json());
  const quiz = await db.$transaction(async (tx) => {
    const existing = await tx.quiz.findUnique({ where: { chapterId: chapter.id } });
    const current = existing
      ? await tx.quiz.update({ where: { id: existing.id }, data: { title: body.title } })
      : await tx.quiz.create({ data: { chapterId: chapter.id, title: body.title } });
    if (existing) await tx.question.deleteMany({ where: { quizId: current.id } });
    for (const [order, question] of body.questions.entries()) {
      await tx.question.create({ data: { quizId: current.id, prompt: question.prompt, order, answers: { create: question.answers } } });
    }
    return tx.quiz.findUnique({ where: { id: current.id }, include: { questions: { orderBy: { order: "asc" }, include: { answers: true } } } });
  });
  return ok(quiz);
});

export const DELETE = withErrorHandler(async (_req, { params }: { params: Promise<{ id: string }> }) => {
  const chapter = await getChapter((await params).id);
  await db.quiz.deleteMany({ where: { chapterId: chapter.id } });
  return ok({ deleted: true });
});