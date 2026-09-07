import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "./db";

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
          where: { email: credentials.email as string },
          include: { roles: { include: { role: true } } },
        });

        if (!user || !user.passwordHash) return null;

        const validPassword = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash,
        );
        if (!validPassword) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.fullName,
          roles: user.roles.map((r) => r.role.slug),
        };
      },
    }),
  ],

  callbacks: {
    // Runs on sign in and whenever the session is checked — bakes roles
    // into the JWT so you're not hitting the DB on every request just to
    // know if someone is a "prof".
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.roles = (user as { roles: string[] }).roles;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.roles = token.roles as string[];
      }
      return session;
    },
  },

  pages: {
    signIn: "/",
  },
});
