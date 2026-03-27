import type { NextAuthConfig } from "next-auth";

// Configuração leve — sem Prisma ou bcrypt — compatível com Edge Runtime (proxy)
export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as {
          id: string;
          role: string;
          setorId: string;
          setorTipo: string;
        };
        token.sub = u.id;
        token.role = u.role;
        token.setorId = u.setorId;
        token.setorTipo = u.setorTipo;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.sub ?? "";
        session.user.role = (token.role as string) as import("@prisma/client").Role;
        session.user.setorId = token.setorId as string;
        session.user.setorTipo = token.setorTipo as string as import("@prisma/client").TipoSetor;
      }
      return session;
    },
  },
};
