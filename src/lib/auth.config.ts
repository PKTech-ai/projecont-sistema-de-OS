import type { NextAuthConfig } from "next-auth";
import type { Role, TipoSetor } from "@prisma/client";

type UserWithSetor = {
  id: string;
  role: Role;
  setorId: string;
  setorTipo: TipoSetor;
};

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 7,
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as UserWithSetor;
        token.id = u.id;
        token.role = u.role;
        token.setorId = u.setorId;
        token.setorTipo = u.setorTipo;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.role = token.role as Role;
        session.user.setorId = token.setorId as string;
        session.user.setorTipo = token.setorTipo as TipoSetor;
      }
      return session;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
