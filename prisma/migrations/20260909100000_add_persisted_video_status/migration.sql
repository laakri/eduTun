CREATE TYPE "VideoStatus" AS ENUM ('UPLOADING', 'PROCESSING', 'READY', 'FAILED');

ALTER TABLE "Chapter"
ADD COLUMN "videoStatus" "VideoStatus" NOT NULL DEFAULT 'PROCESSING';

UPDATE "Chapter"
SET "videoStatus" = 'READY'
WHERE "ready" = true;