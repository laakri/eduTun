import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { ok, withErrorHandler } from "@/lib/api-response";
import { parseBody } from "@/lib/parse-body";
import { ConflictError } from "@/lib/errors";
import { sendVerificationEmail } from "@/lib/verification-email";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  fullName: z.string().min(2),
});

export const POST = withErrorHandler(async (req) => {
  const body = await parseBody(req, registerSchema);

  const email = body.email.trim().toLowerCase();
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    if (existing.passwordHash && !existing.emailVerified) {
      const verification = await sendVerificationEmail(existing);
      return ok({
        requiresVerification: true,
        email,
        resentVerification: true,
        emailDelivered: verification.delivered,
        ...(verification.error ? { emailDeliveryError: verification.error } : {}),
      });
    }

    throw new ConflictError("An account with this email already exists");
  }

  const passwordHash = await bcrypt.hash(body.password, 12);

  const studentRole = await db.role.upsert({
    where: { slug: "student" },
    update: {},
    create: { slug: "student", displayName: "Student" },
  });

  const user = await db.user.create({
    data: {
      email,
      passwordHash,
      fullName: body.fullName,
      emailVerified: null,
      roles: { create: { roleId: studentRole.id } },
    },
  });

  const verification = await sendVerificationEmail(user);

  // Never return passwordHash, even implicitly — select only what's safe.
  return ok({
    requiresVerification: true,
    email: user.email,
    emailDelivered: verification.delivered,
    ...(verification.error ? { emailDeliveryError: verification.error } : {}),
  }, 201);
});
