import { z } from "zod";
import { db } from "@/lib/db";
import { ok, withErrorHandler } from "@/lib/api-response";
import { parseBody } from "@/lib/parse-body";
import { sendVerificationEmail } from "@/lib/verification-email";

const schema = z.object({ email: z.string().email() });

export const POST = withErrorHandler(async (request) => {
  const { email: rawEmail } = await parseBody(request, schema);
  const email = rawEmail.trim().toLowerCase();
  const user = await db.user.findUnique({ where: { email } });

  if (user?.passwordHash && !user.emailVerified) {
    const verification = await sendVerificationEmail(user);

    return ok({
      message: verification.delivered
        ? "A new confirmation email has been sent."
        : "We could not send the confirmation email.",
      emailDelivered: verification.delivered,
      ...(verification.error ? { emailDeliveryError: verification.error } : {}),
    });
  }

  return ok({
    message: "If the account needs confirmation, a new confirmation email has been sent.",
  });
});