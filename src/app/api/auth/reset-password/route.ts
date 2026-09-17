import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { ok, withErrorHandler } from "@/lib/api-response";
import { parseBody } from "@/lib/parse-body";
import { consumePasswordResetToken } from "@/lib/auth-tokens";
import { getPasswordResetUserId } from "@/lib/auth-tokens";
import { AppError } from "@/lib/errors";

const schema = z.object({
  token: z.string().min(32),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const POST = withErrorHandler(async (request) => {
  const { token, password } = await parseBody(request, schema);
  const userId = await getPasswordResetUserId(token);
  if (!userId) throw new AppError("This reset link is invalid or expired", 400, "INVALID_RESET_TOKEN");

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  });
  if (user?.passwordHash && await bcrypt.compare(password, user.passwordHash)) {
    throw new AppError(
      "Choose a password you have not used before.",
      409,
      "PASSWORD_ALREADY_USED",
    );
  }

  const consumedUserId = await consumePasswordResetToken(token);
  if (!consumedUserId) throw new AppError("This reset link is invalid or expired", 400, "INVALID_RESET_TOKEN");

  await db.user.update({
    where: { id: consumedUserId },
    data: { passwordHash: await bcrypt.hash(password, 12) },
  });

  return ok({ message: "Password reset successfully." });
});