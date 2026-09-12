/*
  Warnings:

  - A unique constraint covering the columns `[accessRequestId]` on the table `UserSubscription` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "UserSubscription" ADD COLUMN     "accessRequestId" TEXT,
ADD COLUMN     "bacTypeId" TEXT;

-- CreateTable
CREATE TABLE "BacAccessRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "bacTypeId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewNote" TEXT,
    "reviewedById" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BacAccessRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSubscriptionCategory" (
    "subscriptionId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "selectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserSubscriptionCategory_pkey" PRIMARY KEY ("subscriptionId","categoryId")
);

-- CreateIndex
CREATE INDEX "BacAccessRequest_status_createdAt_idx" ON "BacAccessRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "BacAccessRequest_userId_status_idx" ON "BacAccessRequest"("userId", "status");

-- CreateIndex
CREATE INDEX "UserSubscriptionCategory_categoryId_idx" ON "UserSubscriptionCategory"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "UserSubscription_accessRequestId_key" ON "UserSubscription"("accessRequestId");

-- AddForeignKey
ALTER TABLE "UserSubscription" ADD CONSTRAINT "UserSubscription_bacTypeId_fkey" FOREIGN KEY ("bacTypeId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSubscription" ADD CONSTRAINT "UserSubscription_accessRequestId_fkey" FOREIGN KEY ("accessRequestId") REFERENCES "BacAccessRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BacAccessRequest" ADD CONSTRAINT "BacAccessRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BacAccessRequest" ADD CONSTRAINT "BacAccessRequest_planId_fkey" FOREIGN KEY ("planId") REFERENCES "SubscriptionPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BacAccessRequest" ADD CONSTRAINT "BacAccessRequest_bacTypeId_fkey" FOREIGN KEY ("bacTypeId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BacAccessRequest" ADD CONSTRAINT "BacAccessRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSubscriptionCategory" ADD CONSTRAINT "UserSubscriptionCategory_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "UserSubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSubscriptionCategory" ADD CONSTRAINT "UserSubscriptionCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
