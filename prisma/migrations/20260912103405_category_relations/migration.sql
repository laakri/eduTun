/*
  Safe migration for existing data:
  1) backfill CategoryRelation rows from existing Category.parentId values
  2) drop the legacy parentId column after the data has been preserved
  3) remove the redundant Chapter.ready column
  4) add ordering/index constraints for the new many-to-many structure
*/

-- Add missing timestamp columns with a default so existing rows remain valid.
ALTER TABLE "Category"
  ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Create the new relation table and migrate all legacy parent links.
CREATE TABLE "CategoryRelation" (
    "parentId" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CategoryRelation_pkey" PRIMARY KEY ("parentId","childId")
);

INSERT INTO "CategoryRelation" ("parentId", "childId", "order")
SELECT "parentId", "id", 0
FROM "Category"
WHERE "parentId" IS NOT NULL
ON CONFLICT ("parentId", "childId") DO NOTHING;

-- Drop the legacy self-reference now that the data has been moved.
ALTER TABLE "Category" DROP CONSTRAINT "Category_parentId_fkey";
ALTER TABLE "Category" DROP COLUMN "parentId";

-- Remove redundant chapter-ready flag.
ALTER TABLE "Chapter" DROP COLUMN "ready";

-- Re-number duplicate chapter order values before enforcing uniqueness.
WITH ranked_chapters AS (
  SELECT
    c."id",
    ROW_NUMBER() OVER (
      PARTITION BY c."courseId"
      ORDER BY c."createdAt" ASC, c."id" ASC
    ) - 1 AS new_order
  FROM "Chapter" c
)
UPDATE "Chapter" ch
SET "order" = ranked_chapters.new_order
FROM ranked_chapters
WHERE ch."id" = ranked_chapters."id";

-- Add ordering on CourseCategory.
ALTER TABLE "CourseCategory" ADD COLUMN "order" INTEGER NOT NULL DEFAULT 0;

-- Create indexes and constraints for the new structure.
CREATE INDEX "CategoryRelation_childId_idx" ON "CategoryRelation"("childId");
CREATE INDEX "CategoryRelation_parentId_order_idx" ON "CategoryRelation"("parentId", "order");
CREATE UNIQUE INDEX "Chapter_courseId_order_key" ON "Chapter"("courseId", "order");
CREATE INDEX "CourseCategory_categoryId_order_idx" ON "CourseCategory"("categoryId", "order");

ALTER TABLE "CategoryRelation" ADD CONSTRAINT "CategoryRelation_parentId_fkey"
FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CategoryRelation" ADD CONSTRAINT "CategoryRelation_childId_fkey"
FOREIGN KEY ("childId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
