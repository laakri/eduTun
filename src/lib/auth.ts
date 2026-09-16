import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { db } from "./db";

const googleProvider = process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
  ? Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    })
  : null;

export const { handlers, auth, signIn, signOut } = NextAuth({
  // IMPORTANT: Credentials provider requires JWT sessions, not "database".
  // Database session strategy only works with OAuth providers going
  // through the Prisma adapter. Mixing Credentials + database sessions
  // is a common mistake that fails silently in dev and confusingly in prod.
  session: { strategy: "jwt" },

  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await db.user.findUnique({
          where: { email: (credentials.email as string).trim().toLowerCase() },
          include: { roles: { include: { role: true } } },
        });

        if (!user || !user.passwordHash || !user.emailVerified) return null;

        const validPassword = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash,
        );
        if (!validPassword) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.fullName,
          image: user.avatarUrl ?? null,
          roles: user.roles.map((r) => r.role.slug),
        };
      },
    }),
    ...(googleProvider ? [googleProvider] : []),
  ],

  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider !== "google") return true;

      const email = user.email?.trim().toLowerCase();
      const emailVerified = (profile as { email_verified?: boolean } | undefined)
        ?.email_verified;
      if (!email || emailVerified === false) return false;

      const studentRole = await db.role.upsert({
        where: { slug: "student" },
        update: {},
        create: { slug: "student", displayName: "Student" },
      });
      const existing = await db.user.findUnique({ where: { email } });

      if (!existing) {
        await db.user.create({
          data: {
            email,
            fullName: user.name?.trim() || email.split("@")[0] || "Student",
            avatarUrl: user.image ?? null,
            emailVerified: new Date(),
            roles: { create: { roleId: studentRole.id } },
          },
        });
      } else if (!existing.emailVerified) {
        await db.user.update({
          where: { id: existing.id },
          data: { emailVerified: new Date(), avatarUrl: user.image ?? existing.avatarUrl },
        });
      }

      return true;
    },
    // Runs on sign in and whenever the session is checked — bakes roles
    // into the JWT so you're not hitting the DB on every request just to
    // know if someone is a "prof".
    async jwt({ token, user }) {
      if (user) {
        const email = user.email?.toLowerCase();
        const databaseUser = email
          ? await db.user.findUnique({
              where: { email },
              include: { roles: { include: { role: true } } },
            })
          : null;
        token.id = databaseUser?.id ?? user.id ?? "";
        token.image = databaseUser?.avatarUrl ?? (user as { image?: string | null }).image ?? null;
        token.roles = databaseUser?.roles.map((item) => item.role.slug) ?? [];
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.image = (token.image as string | null | undefined) ?? null;
        session.user.roles = token.roles as string[];
      }
      return session;
    },
  },

  pages: {
    signIn: "/register",
  },
});
