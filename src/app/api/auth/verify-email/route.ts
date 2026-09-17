import { NextResponse } from "next/server";
import { consumeEmailVerificationToken } from "@/lib/auth-tokens";
import { getAppUrl } from "@/lib/email";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  const verified = token ? await consumeEmailVerificationToken(token) : null;
  const status = verified ? "verified" : "invalid";
  console.info("Email verification completed", { status });
  return NextResponse.redirect(
    `${getAppUrl()}/auth/verification?status=${status}`,
  );
}