import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import type { Session } from "next-auth";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { mapContabilRoleToOs } from "@/lib/contabil-role-map";
import { getSyncPasswordHash } from "@/lib/contabil-sync-placeholder";

function getJwtSecret() {
  const s = process.env.JWT_SECRET;
  if (!s) return null;
  return new TextEncoder().encode(s);
}

/**
 * Sessão do dashboard: NextAuth (credenciais locais) ou cookie `contabil_session` (Contábil Pro).
 */
export async function getDashboardSession(): Promise<Session | null> {
  const session = await auth();
  if (session?.user?.id) return session;

  const cookieStore = await cookies();
  const token = cookieStore.get("contabil_session")?.value;
  if (!token) return null;

  const secret = getJwtSecret();
  if (!secret) return null;

  let payload: {
    sub?: string;
    email?: string;
    nome?: string;
    role?: string;
  };
  try {
    const verified = await jwtVerify(token, secret);
    payload = verified.payload as typeof payload;
  } catch {
    return null;
  }

  const id = payload.sub;
  if (!id || !payload.email) return null;

  let usuario = await prisma.usuario.findUnique({
    where: { id },
    include: { setor: true },
  });

  if (!usuario) {
    usuario = await tryBootstrapUsuarioFromContabilJwt(payload);
  }

  if (!usuario || !usuario.ativo) return null;

  return {
    expires: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
    user: {
      id: usuario.id,
      email: usuario.email,
      name: usuario.nome,
      role: usuario.role,
      setorId: usuario.setorId,
      setorTipo: usuario.setor.tipo,
      primeiroAcesso: usuario.primeiroAcesso,
    },
  };
}

async function tryBootstrapUsuarioFromContabilJwt(payload: {
  sub?: string;
  email?: string;
  nome?: string;
  role?: string;
}) {
  const id = payload.sub!;
  const email = payload.email!;
  const setor = await prisma.setor.findFirst({
    where: { tipo: "CONTABIL" },
  });
  if (!setor) {
    console.error("[contabil-session] Setor CONTABIL não encontrado — rode o seed.");
    return null;
  }

  const emailTaken = await prisma.usuario.findUnique({ where: { email } });
  if (emailTaken && emailTaken.id !== id) {
    console.warn("[contabil-session] Email já usado por outro utilizador local; não bootstrap.", email);
    return null;
  }

  const senha = await getSyncPasswordHash();
  const role = mapContabilRoleToOs(payload.role);
  const nome = payload.nome?.trim() || "Utilizador";
  const now = new Date();

  try {
    // upsert: evita P2002 (corrida entre pedidos paralelos ou utilizador já criado por webhook)
    return await prisma.usuario.upsert({
      where: { id },
      create: {
        id,
        email,
        nome,
        senha,
        role,
        setorId: setor.id,
        origemContabilPro: true,
        sincronizadoEm: now,
      },
      update: {
        email,
        nome,
        role,
        setorId: setor.id,
        origemContabilPro: true,
        sincronizadoEm: now,
      },
      include: { setor: true },
    });
  } catch (e) {
    console.error("[contabil-session] Falha ao criar/atualizar utilizador a partir do JWT:", e);
    return null;
  }
}
