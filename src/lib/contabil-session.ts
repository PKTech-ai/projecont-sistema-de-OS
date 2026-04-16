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
    console.log('[contabil-session] Token validado para payload:', payload);
  } catch (err) {
    console.error('[contabil-session] Erro ao validar token:', err);
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
    console.log('[contabil-session] Usuário não encontrado no DB local, tentando bootstrap para:', payload.email || payload.username);
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
      // Reconciliação atômica de PK
      // NOTA: Se houver FKs sem CASCADE no banco, este comando falhará.
      await prisma.$executeRawUnsafe(
        `UPDATE "Usuario" SET id = $1 WHERE id = $2`,
        id, existing.id
      );
      console.log(`[contabil-session] Reconciliação de ID concluída.`);
    } catch (err: any) {
      console.error("[contabil-session] Falha CRÍTICA ao reconciliar ID. Possível restrição de integridade (FK):", err.message);
      // Se falhar a reconciliação, tentamos buscar pelo ID do Contabil para ver se ele já existe de outra forma
      const targetUser = await prisma.usuario.findUnique({ where: { id } });
      if (targetUser) {
        console.log("[contabil-session] O ID do Contábil já existe no OS para outro usuário. Abortando bootstrap.");
        return null;
      }
      return null;
    }
  }


  const senha = await getSyncPasswordHash();
  const role = mapContabilRoleToOs(payload.role);
  const nome = payload.nome?.trim() || "Utilizador";
  const now = new Date();

  // Verificação final antes de salvar para evitar conflitos em requisições paralelas
  const checkUser = await prisma.usuario.findFirst({
    where: {
      OR: [
        { id },
        email ? { email } : {},
        username ? { username } : {}
      ].filter(o => Object.keys(o).length > 0)
    }
  });

  try {
    if (checkUser) {
      console.log(`[contabil-session] Usuário encontrado (ID: ${checkUser.id}), atualizando dados.`);
      return await prisma.usuario.update({
        where: { id: checkUser.id },
        data: {
          id, // Tenta sincronizar o ID caso o UPDATE anterior tenha sido pulado/falhado
          email: email ?? undefined,
          username: username ?? undefined,
          nome,
          role,
          setorId: setor.id,
          sincronizadoEm: now,
        },
        include: { setor: true },
      });
    } else {
      console.log(`[contabil-session] Criando novo usuário SSO: ${email || username}`);
      return await prisma.usuario.create({
        data: {
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
        include: { setor: true },
      });
    }
  } catch (e: any) {
    console.error(`[contabil-session] Falha crítica no bootstrap SSO para ${email || username}:`, e.message);
    return null;
  }
}

