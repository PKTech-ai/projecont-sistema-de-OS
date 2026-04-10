import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import type { Session } from "next-auth";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { mapContabilRoleToOs } from "@/lib/contabil-role-map";
import { getSyncPasswordHash } from "@/lib/contabil-sync-placeholder";

function getJwtSecret() {
  const s = process.env.JWT_SECRET || 'dev-shared-jwt-contabil-os';
  return new TextEncoder().encode(s);
}

/*
 * Sessão do dashboard: NextAuth (credenciais locais) ou cookie `contabil_session` (Contábil Pro)
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
    username?: string;
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
  // Requer pelo menos um identificador (email OU username)
  if (!id || (!payload.email && !payload.username)) return null;

  let usuario = await prisma.usuario.findUnique({
    where: { id },
    include: { setor: true },
  });

  if (!usuario) {
    usuario = (await tryBootstrapUsuarioFromContabilJwt(payload)) as typeof usuario;
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
  username?: string;
  nome?: string;
  role?: string;
}) {
  const id = payload.sub!;
  const email = payload.email?.toLowerCase().trim() ?? null;
  const username = payload.username?.toLowerCase().trim() ?? null;

  const setor = await prisma.setor.findFirst({
    where: { tipo: "CONTABIL" },
  });
  if (!setor) {
    console.error("[contabil-session] Setor CONTABIL não encontrado.");
    return null;
  }

  // RECONCILIAÇÃO: Se o usuário já existe com esse email/username mas ID diferente,
  // precisamos atualizar o ID antigo para o novo (UUID do Contabil) via SQL bruto
  // porque o Prisma não permite atualizar Primary Keys diretamente.
  let existing = await prisma.usuario.findFirst({
    where: {
      OR: [
        email ? { email } : {},
        username ? { username } : {}
      ].filter(o => Object.keys(o).length > 0)
    }
  });

  if (existing && existing.id !== id) {
    console.log(`[contabil-session] Reconciliando ID para ${email || username}: ${existing.id} -> ${id}`);
    try {
      // Atualização atômica de PK via Raw SQL
      await prisma.$executeRawUnsafe(
        `UPDATE "Usuario" SET id = $1 WHERE id = $2`,
        id, existing.id
      );
    } catch (err) {
      console.error("[contabil-session] Erro ao reconciliar ID via SQL:", err);
      return null;
    }
  }

  const senha = await getSyncPasswordHash();
  const role = mapContabilRoleToOs(payload.role);
  const nome = payload.nome?.trim() || "Utilizador";
  const now = new Date();

  try {
    return await prisma.usuario.upsert({
      where: { id },
      create: {
        id,
        email: email ?? `sso-${id}@pktech.ai`,
        username: username ?? undefined,
        nome,
        senha,
        role,
        setorId: setor.id,
        origemContabilPro: true,
        sincronizadoEm: now,
        primeiroAcesso: false,
      },
      update: {
        email: email ?? undefined,
        username: username ?? undefined,
        nome,
        role,
        setorId: setor.id,
        sincronizadoEm: now,
      },
      include: { setor: true },
    });
  } catch (e) {
    console.error("[contabil-session] Falha no upsert SSO:", e);
    return null;
  }
}
