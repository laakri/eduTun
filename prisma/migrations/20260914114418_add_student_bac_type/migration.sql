-- AlterTable
ALTER TABLE "User" ADD COLUMN     "bacTypeId" TEXT;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_bacTypeId_fkey" FOREIGN KEY ("bacTypeId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
