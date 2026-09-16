-- AlterTable
ALTER TABLE "User" ADD COLUMN "emailVerified" TIMESTAMP(3);

-- Existing password accounts have already completed the previous signup flow.
UPDATE "User" SET "emailVerified" = CURRENT_TIMESTAMP WHERE "passwordHash" IS NOT NULL;
