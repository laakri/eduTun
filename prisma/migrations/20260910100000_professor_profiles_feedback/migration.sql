CREATE TABLE "ProfessorRating" (
    "id" TEXT NOT NULL,
    "professorId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProfessorRating_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ChapterVote" (
    "id" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ChapterVote_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ChapterComment" (
    "id" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ChapterComment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProfessorRating_professorId_userId_key" ON "ProfessorRating"("professorId", "userId");
CREATE INDEX "ProfessorRating_professorId_idx" ON "ProfessorRating"("professorId");
CREATE UNIQUE INDEX "ChapterVote_chapterId_userId_key" ON "ChapterVote"("chapterId", "userId");
CREATE INDEX "ChapterVote_chapterId_idx" ON "ChapterVote"("chapterId");
CREATE INDEX "ChapterComment_chapterId_createdAt_idx" ON "ChapterComment"("chapterId", "createdAt");

ALTER TABLE "ProfessorRating" ADD CONSTRAINT "ProfessorRating_professorId_fkey" FOREIGN KEY ("professorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProfessorRating" ADD CONSTRAINT "ProfessorRating_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChapterVote" ADD CONSTRAINT "ChapterVote_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChapterVote" ADD CONSTRAINT "ChapterVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChapterComment" ADD CONSTRAINT "ChapterComment_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChapterComment" ADD CONSTRAINT "ChapterComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;