import { createEmailVerificationToken } from "@/lib/auth-tokens";
import { escapeHtml, getAppUrl, sendEmail } from "@/lib/email";
import { AppError } from "@/lib/errors";

export async function sendVerificationEmail(user: {
  email: string;
  fullName: string;
}) {
  const token = await createEmailVerificationToken(user.email);
  const verificationUrl = `${getAppUrl()}/api/auth/verify-email?token=${token}`;

  try {
    await sendEmail({
      to: user.email,
      subject: "Confirm your Curio email",
      html: `
        <div style="margin:0;background:#f4f6f8;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;color:#111827">
          <div style="margin:0 auto;max-width:560px;overflow:hidden;border:1px solid #dfe4ea;background:#ffffff">
            <div style="background:#111827;padding:26px 30px;color:#ffffff">
              <div style="font-size:13px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#93c5fd">Curio</div>
              <div style="margin-top:18px;font-size:26px;font-weight:700;line-height:1.2">Your learning starts here.</div>
            </div>
            <div style="padding:30px">
              <p style="margin:0;font-size:16px;line-height:1.6">Hello ${escapeHtml(user.fullName)},</p>
              <p style="margin:12px 0 0;font-size:15px;line-height:1.7;color:#526070">Confirm your email address to activate your Curio account and continue learning.</p>
              <a href="${verificationUrl}" style="display:inline-block;margin-top:24px;background:#2563eb;padding:13px 20px;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none">Confirm email address</a>
              <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#7b8794">This link expires in 24 hours. If you did not create a Curio account, you can safely ignore this email.</p>
            </div>
            <div style="border-top:1px solid #e8ecf0;padding:18px 30px;color:#7b8794;font-size:12px">Curio · Learn with a clear plan.</div>
          </div>
        </div>
      `,
    });
  } catch (error) {
    if (process.env.NODE_ENV === "production") {
      throw new AppError(
        "Email delivery is temporarily unavailable. Please try again later.",
        503,
        "EMAIL_DELIVERY_UNAVAILABLE",
      );
    }

    console.error("Email delivery unavailable.", error);
    return {
      verificationUrl,
      delivered: false,
      error: "Resend rejected the sender. Verify your domain and EMAIL_FROM address in Resend.",
    };
  }

  return { verificationUrl, delivered: true };
}