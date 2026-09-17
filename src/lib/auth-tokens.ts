import { createHash, randomBytes } from "node:crypto";
import { db } from "@/lib/db";

const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
const RESET_TTL_MS = 60 * 60 * 1000;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createEmailVerificationToken(email: string) {
  const rawToken = randomBytes(32).toString("hex");
  await db.verificationToken.deleteMany({ where: { identifier: email } });
  await db.verificationToken.create({
    data: {
      identifier: email,
      token: hashToken(rawToken),
      expires: new Date(Date.now() + VERIFICATION_TTL_MS),
    },
  });
  return rawToken;
}

export async function createPasswordResetToken(userId: string) {
  const rawToken = randomBytes(32).toString("hex");
  const identifier = `reset:${userId}`;
  await db.verificationToken.deleteMany({ where: { identifier } });
  await db.verificationToken.create({
    data: {
      identifier,
      token: hashToken(rawToken),
      expires: new Date(Date.now() + RESET_TTL_MS),
    },
  });
  return rawToken;
}

export async function consumeEmailVerificationToken(rawToken: string) {
  const token = await db.verificationToken.findFirst({
    where: {
      token: hashToken(rawToken),
      identifier: { not: { startsWith: "reset:" } },
      expires: { gt: new Date() },
    },
  });

  if (!token) return null;

  await db.$transaction([
    db.user.update({
      where: { email: token.identifier },
      data: { emailVerified: new Date() },
    }),
    db.verificationToken.delete({ where: { token: token.token } }),
  ]);

  return token.identifier;
}

export async function consumePasswordResetToken(rawToken: string) {
  const token = await db.verificationToken.findFirst({
    where: {
      token: hashToken(rawToken),
      identifier: { startsWith: "reset:" },
      expires: { gt: new Date() },
    },
  });

  if (!token) return null;

  const userId = token.identifier.slice("reset:".length);
  await db.verificationToken.delete({ where: { token: token.token } });
  return userId;
}

export async function getPasswordResetUserId(rawToken: string) {
  const token = await db.verificationToken.findFirst({
    where: {
      token: hashToken(rawToken),
      identifier: { startsWith: "reset:" },
      expires: { gt: new Date() },
    },
    select: { identifier: true },
  });

  return token ? token.identifier.slice("reset:".length) : null;
}