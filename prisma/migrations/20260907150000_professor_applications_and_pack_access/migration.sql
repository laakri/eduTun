-- Pack access is explicitly recorded so a student cannot unlock content from
-- the browser alone. A later payment provider creates the same row.
ALTER TABLE "Pack" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE "PackEnrollment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "packId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "source" TEXT NOT NULL DEFAULT 'manual',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PackEnrollment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PackEnrollment_userId_packId_key" ON "PackEnrollment"("userId", "packId");
CREATE INDEX "PackEnrollment_userId_status_idx" ON "PackEnrollment"("userId", "status");
ALTER TABLE "PackEnrollment" ADD CONSTRAINT "PackEnrollment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PackEnrollment" ADD CONSTRAINT "PackEnrollment_packId_fkey" FOREIGN KEY ("packId") REFERENCES "Pack"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ProfApplication" (
    "id" TEXT NOT NULL,
    "applicantId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "phone" TEXT NOT NULL,
    "institution" TEXT NOT NULL,
    "institutionType" TEXT NOT NULL,
    "experienceRange" TEXT NOT NULL,
    "qualification" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "identityDocumentKey" TEXT NOT NULL,
    "qualificationProofKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewNote" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProfApplication_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProfApplication_status_createdAt_idx" ON "ProfApplication"("status", "createdAt");
CREATE INDEX "ProfApplication_applicantId_status_idx" ON "ProfApplication"("applicantId", "status");
ALTER TABLE "ProfApplication" ADD CONSTRAINT "ProfApplication_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProfApplication" ADD CONSTRAINT "ProfApplication_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "ProfApplicationCategory" (
    "applicationId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    CONSTRAINT "ProfApplicationCategory_pkey" PRIMARY KEY ("applicationId", "categoryId")
);
ALTER TABLE "ProfApplicationCategory" ADD CONSTRAINT "ProfApplicationCategory_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "ProfApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProfApplicationCategory" ADD CONSTRAINT "ProfApplicationCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
