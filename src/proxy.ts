import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

export default auth(function proxy(req) {
  const session = req.auth;
  const pathname = req.nextUrl.pathname;

  // Rotas de TV — acesso público (para telões sem login de sessão)
  if (pathname.startsWith("/tv")) {
    return NextResponse.next();
  }

  // Rotas do dashboard — exige autenticação
  if (!pathname.startsWith("/login") && !pathname.startsWith("/api")) {
    if (!session) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    // Role TV só pode acessar /tv/*
    if (session.user?.role === "TV") {
      return NextResponse.redirect(
        new URL(`/tv/${session.user.setorTipo?.toLowerCase()}`, req.url)
      );
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
