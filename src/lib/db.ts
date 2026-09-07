import { PrismaClient } from "@prisma/client";

// Next.js hot-reloads modules in dev, which would create a new PrismaClient
// (and a new DB connection pool) on every file save without this guard.
// This is not optional — skipping it is the #1 cause of "too many
// connections" errors once you start actively developing.

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
