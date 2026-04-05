import { NextAuth } from "@auth/nextjs";
import Credentials from "@auth/core/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";

import { prisma } from "@ev/db";
import type { Role } from "@ev/types";

export const { handlers, auth } = NextAuth({
  // Auth.js types giữa các bản @auth/core có thể lệch nhau trong workspace MVP.
  // Cast `any` để bypass type-only mismatch, runtime vẫn dùng đúng adapter.
  adapter: PrismaAdapter(prisma) as any,
  session: { strategy: "jwt" },
  trustHost: true,
  secret:
    process.env.AUTH_SECRET ??
    process.env.NEXTAUTH_SECRET ??
    "dev-secret",
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({
          where: { email: email as string },
        });
        if (!user?.passwordHash) return null;

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;

        if (
          user.disabledAt &&
          (user.role === "station_owner" || user.role === "admin")
        ) {
          return null;
        }

        // The returned user object is attached to `user` in Auth callbacks.
        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
          role: user.role as Role,
        };
      },
    }) as any,
  ],
  callbacks: {
    async authorized() {
      return true;
    },
    async jwt({ token, user }: any) {
      // Persist id/role in JWT so subsequent requests can read RBAC.
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }: any) {
      // Attach role/id to session for RBAC.
      if (session.user) {
        session.user.id = token?.id;
        session.user.role = token?.role;
      }
      return session;
    },
  },
});

