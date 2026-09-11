-- AlterTable
ALTER TABLE "ChapterComment" ADD COLUMN     "parentId" TEXT;

-- CreateIndex
CREATE INDEX "ChapterComment_parentId_idx" ON "ChapterComment"("parentId");

-- AddForeignKey
ALTER TABLE "ChapterComment" ADD CONSTRAINT "ChapterComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ChapterComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
