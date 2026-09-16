import { createEmailVerificationToken } from "@/lib/auth-tokens";
import { escapeHtml, getAppUrl, sendEmail } from "@/lib/email";

export async function sendVerificationEmail(user: {
  email: string;
  fullName: string;
}) {
  const token = await createEmailVerificationToken(user.email);
  const verificationUrl = `${getAppUrl()}/api/auth/verify-email?token=${token}`;

  await sendEmail({
    to: user.email,
    subject: "Confirm your Tunis Edu email",
    html: `<p>Hello ${escapeHtml(user.fullName)},</p><p>Confirm your email to activate your Tunis Edu account:</p><p><a href="${verificationUrl}">Confirm email address</a></p><p>This link expires in 24 hours.</p>`,
  });

  return verificationUrl;
}