import { z } from "zod";

import { requireUser } from "@/core/auth.service";
import { ConflictError, ValidationError } from "@/lib/errors";
import { ok, withErrorHandler } from "@/lib/api-response";
import { db } from "@/lib/db";
import { uploadToBunnyStorage } from "@/lib/bunny";

const applicationSchema = z.object({
  fullName: z.string().min(2).max(120),
  dateOfBirth: z.coerce.date(),
  phone: z.string().min(6).max(30),
  categoryIds: z.array(z.string().cuid()).min(1),
  institution: z.string().min(2).max(160),
  institutionType: z.string().min(2).max(60),
  experienceRange: z.string().min(1).max(40),
  qualification: z.string().min(2).max(240),
  message: z.string().min(10).max(2_000),
});

const ACCEPTED_DOCUMENT_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
]);
const MAX_DOCUMENT_BYTES = 8 * 1024 * 1024;

export const POST = withErrorHandler(async (req) => {
  const user = await requireUser();
  const form = await req.formData();
  const identityDocument = form.get("identityDocument");
  const qualificationProof = form.get("qualificationProof");
  const categoryIds = form.getAll("categoryId").filter(
    (value): value is string => typeof value === "string",
  );

  const input = applicationSchema.parse({
    fullName: form.get("fullName"),
    dateOfBirth: form.get("dateOfBirth"),
    phone: form.get("phone"),
    categoryIds,
    institution: form.get("institution"),
    institutionType: form.get("institutionType"),
    experienceRange: form.get("experienceRange"),
    qualification: form.get("qualification"),
    message: form.get("message"),
  });

  assertDocument(identityDocument, "An identity document");
  assertDocument(qualificationProof, "A qualification document");

  const existingPending = await db.profApplication.findFirst({
    where: { applicantId: user.id, status: "pending" },
    select: { id: true },
  });
  if (existingPending) {
    throw new ConflictError("You already have an application under review.");
  }

  const categories = await db.category.findMany({
    where: { id: { in: input.categoryIds } },
    select: { id: true },
  });
  if (categories.length !== input.categoryIds.length) {
    throw new ValidationError("One or more teaching categories no longer exist.");
  }

  const folder = `professor-applications/${user.id}/${crypto.randomUUID()}`;
  const identityKey = `${folder}/identity-${safeFileName(identityDocument.name)}`;
  const proofKey = `${folder}/qualification-${safeFileName(qualificationProof.name)}`;

  await Promise.all([
    uploadToBunnyStorage(
      identityKey,
      Buffer.from(await identityDocument.arrayBuffer()),
      identityDocument.type,
    ),
    uploadToBunnyStorage(
      proofKey,
      Buffer.from(await qualificationProof.arrayBuffer()),
      qualificationProof.type,
    ),
  ]);

  const application = await db.profApplication.create({
    data: {
      applicantId: user.id,
      fullName: input.fullName,
      dateOfBirth: input.dateOfBirth,
      phone: input.phone,
      institution: input.institution,
      institutionType: input.institutionType,
      experienceRange: input.experienceRange,
      qualification: input.qualification,
      message: input.message,
      identityDocumentKey: identityKey,
      qualificationProofKey: proofKey,
      categories: { create: input.categoryIds.map((categoryId) => ({ categoryId })) },
    },
    select: { id: true, status: true, createdAt: true },
  });

  return ok(application, 201);
});

function assertDocument(value: FormDataEntryValue | null, label: string): asserts value is File {
  if (!(value instanceof File)) throw new ValidationError(`${label} is required.`);
  if (!ACCEPTED_DOCUMENT_TYPES.has(value.type)) {
    throw new ValidationError(`${label} must be a PDF, JPG, or PNG.`);
  }
  if (value.size === 0 || value.size > MAX_DOCUMENT_BYTES) {
    throw new ValidationError(`${label} must be no larger than 8 MB.`);
  }
}

function safeFileName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").slice(0, 120) || "document";
}
