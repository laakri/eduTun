/*
  Warnings:

  - A unique constraint covering the columns `[packId,courseId]` on the table `PackItem` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[packId,categoryId]` on the table `PackItem` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "VideoStatus" AS ENUM ('PENDING_UPLOAD', 'UPLOADED', 'READY', 'FAILED');

-- AlterTable
ALTER TABLE "Chapter" ADD COLUMN     "videoStatus" "VideoStatus" NOT NULL DEFAULT 'PENDING_UPLOAD',
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Course" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Pack" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "PackEnrollment" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ProfApplication" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateIndex
CREATE UNIQUE INDEX "PackItem_packId_courseId_key" ON "PackItem"("packId", "courseId");

-- CreateIndex
CREATE UNIQUE INDEX "PackItem_packId_categoryId_key" ON "PackItem"("packId", "categoryId");
