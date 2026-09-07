import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { ok, withErrorHandler } from "@/lib/api-response";
import { parseBody } from "@/lib/parse-body";
import { ConflictError } from "@/lib/errors";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  fullName: z.string().min(2),
});

export const POST = withErrorHandler(async (req) => {
  const body = await parseBody(req, registerSchema);

  const existing = await db.user.findUnique({ where: { email: body.email } });
  if (existing) throw new ConflictError("An account with this email already exists");

  const passwordHash = await bcrypt.hash(body.password, 10);

  const studentRole = await db.role.upsert({
    where: { slug: "student" },
    update: {},
    create: { slug: "student", displayName: "Student" },
  });

  const user = await db.user.create({
    data: {
      email: body.email,
      passwordHash,
      fullName: body.fullName,
      roles: { create: { roleId: studentRole.id } },
    },
  });

  // Never return passwordHash, even implicitly — select only what's safe.
  return ok({ id: user.id, email: user.email, fullName: user.fullName }, 201);
});
