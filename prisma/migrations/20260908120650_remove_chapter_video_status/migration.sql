/*
  Warnings:

  - You are about to drop the column `videoStatus` on the `Chapter` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Chapter" DROP COLUMN "videoStatus";

-- DropEnum
DROP TYPE "VideoStatus";
