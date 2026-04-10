import type { NextAuthConfig } from "next-auth";
import type { Role, TipoSetor } from "@prisma/client";

type UserWithSetor = {
  id: string;
  role: Role;
  setorId: string;
  setorTipo: TipoSetor;
  primeiroAcesso: boolean;
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
        token.primeiroAcesso = u.primeiroAcesso;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.role = token.role as Role;
        session.user.setorId = token.setorId as string;
        session.user.setorTipo = token.setorTipo as TipoSetor;
        session.user.primeiroAcesso = token.primeiroAcesso as boolean;
      }
      return session;
    },
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const isLoggedIn = !!auth?.user;

      // Rotas públicas
      if (pathname.startsWith("/login")) {
        return true;
      }

      // Não autenticado → login
      if (!isLoggedIn) return false;

      return true;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
