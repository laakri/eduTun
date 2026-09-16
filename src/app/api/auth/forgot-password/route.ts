import { z } from "zod";
import { db } from "@/lib/db";
import { ok, withErrorHandler } from "@/lib/api-response";
import { parseBody } from "@/lib/parse-body";
import { createPasswordResetToken } from "@/lib/auth-tokens";
import { escapeHtml, getAppUrl, sendEmail } from "@/lib/email";

const schema = z.object({ email: z.string().email() });

export const POST = withErrorHandler(async (request) => {
  const { email: rawEmail } = await parseBody(request, schema);
  const email = rawEmail.trim().toLowerCase();
  const user = await db.user.findUnique({ where: { email } });

  if (user?.passwordHash) {
    const token = await createPasswordResetToken(user.id);
    const resetUrl = `${getAppUrl()}/register?mode=reset&token=${token}`;
    await sendEmail({
      to: email,
      subject: "Reset your Tunis Edu password",
      html: `<p>Hello ${escapeHtml(user.fullName)},</p><p>Reset your password using this link:</p><p><a href="${resetUrl}">Reset password</a></p><p>This link expires in one hour.</p>`,
    });
  }

  return ok({ message: "If an account exists, a reset link has been sent." });
});