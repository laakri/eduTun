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
  let devVerificationUrl: string | undefined;

  if (user?.passwordHash && !user.emailVerified) {
    const verificationUrl = await sendVerificationEmail(user);
    if (process.env.NODE_ENV !== "production") {
      devVerificationUrl = verificationUrl;
    }
  }

  return ok({
    message: "If the account needs confirmation, a new email has been sent.",
    ...(devVerificationUrl ? { devVerificationUrl } : {}),
  });
});