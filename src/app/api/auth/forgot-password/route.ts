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
    try {
      await sendEmail({
        to: email,
        subject: "Reset your Curio password",
        html: `<div style="margin:0;background:#f4f6f8;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;color:#111827"><div style="margin:0 auto;max-width:560px;overflow:hidden;border:1px solid #dfe4ea;background:#ffffff"><div style="background:#111827;padding:26px 30px;color:#ffffff"><div style="font-size:13px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#93c5fd">Curio</div><div style="margin-top:18px;font-size:26px;font-weight:700;line-height:1.2">Reset your password</div></div><div style="padding:30px"><p style="margin:0;font-size:16px;line-height:1.6">Hello ${escapeHtml(user.fullName)},</p><p style="margin:12px 0 0;font-size:15px;line-height:1.7;color:#526070">Use the button below to choose a new password for your Curio account.</p><a href="${resetUrl}" style="display:inline-block;margin-top:24px;background:#2563eb;padding:13px 20px;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none">Reset password</a><p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#7b8794">This link expires in one hour. If you did not request a password reset, you can safely ignore this email.</p></div><div style="border-top:1px solid #e8ecf0;padding:18px 30px;color:#7b8794;font-size:12px">Curio · Learn with a clear plan.</div></div></div>`,
      });
    } catch (error) {
      console.error("Password reset email delivery failed", error);
      return ok({
        emailDelivered: false,
        message: "We could not send the reset email. Please verify your email delivery settings and try again.",
      });
    }

    return ok({
      emailDelivered: true,
      message: "Reset link sent. Check your inbox and spam folder.",
    });
  }

  return ok({
    emailDelivered: false,
    message: "If an account exists, a reset link has been sent.",
  });
});