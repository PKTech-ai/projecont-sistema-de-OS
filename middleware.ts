import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

/** Presença de cookie de sessão NextAuth (sem invocar auth/Prisma no Edge). */
function hasNextAuthSessionCookie(request: NextRequest): boolean {
  const names = [
    "authjs.session-token",
    "__Secure-authjs.session-token",
    "next-auth.session-token",
    "__Secure-next-auth.session-token",
  ];
  return names.some((n) => request.cookies.has(n));
}

function getJwtSecretBytes() {
  const s = process.env.JWT_SECRET || 'dev-shared-jwt-contabil-os';
  return new TextEncoder().encode(s);
}

const publicPaths = [
  "/login",
  "/api/auth",
  "/api/webhooks",
  "/api/cron/reconcile",
  "/api/jobs",
];

function isPublicPath(pathname: string): boolean {
  if (pathname.startsWith("/_next")) return true;
  if (pathname === "/favicon.ico") return true;
  return publicPaths.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  if (hasNextAuthSessionCookie(request)) {
    return NextResponse.next();
  }

  const token = request.cookies.get("contabil_session")?.value;
  if (token) {
    const secret = getJwtSecretBytes();
    if (secret) {
      try {
        await jwtVerify(token, secret);
        return NextResponse.next();
      } catch {
        // token inválido
      }
    }
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("callbackUrl", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
