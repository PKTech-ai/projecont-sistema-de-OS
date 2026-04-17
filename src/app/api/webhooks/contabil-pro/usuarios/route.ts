import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertWebhookSecret } from "@/lib/webhook-auth";
import { mapContabilRoleToOs } from "@/lib/contabil-role-map";
import { getSyncPasswordHash } from "@/lib/contabil-sync-placeholder";
import bcrypt from "bcryptjs";

type UsuarioPayload = {
  id: string;
  email?: string | null;
  username?: string | null;
  nome: string;
  role?: string;
  team?: string | null;
  subteam?: string | null;
  ativo?: boolean;
  newPassword?: string; // apenas no evento password_sync
};

export async function POST(request: NextRequest) {
  const denied = assertWebhookSecret(request);
  if (denied) return denied;

  let body: { event?: string; data?: UsuarioPayload & { id?: string } };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { event, data } = body;
  if (!data?.id) {
    return NextResponse.json({ error: "data.id obrigatório" }, { status: 400 });
  }

  // ── Soft-delete ───────────────────────────────────────────────────────────
  if (event === "usuario.deleted") {
    await prisma.usuario.updateMany({
      where: { id: data.id },
      data: { ativo: false, sincronizadoEm: new Date() },
    });
    return NextResponse.json({ ok: true });
  }

  // ── Sincronização de senha ────────────────────────────────────────────────
  if (event === "usuario.password_sync") {
    if (!data.newPassword) {
      return NextResponse.json({ error: "newPassword obrigatório" }, { status: 400 });
    }
    // Procura o utilizador por id, depois por username, depois por email
    let usuario = await prisma.usuario.findUnique({ where: { id: data.id } });
    if (!usuario && data.username) {
      usuario = await prisma.usuario.findFirst({ where: { username: data.username } });
    }
    if (!usuario && data.email) {
      usuario = await prisma.usuario.findFirst({ where: { email: data.email } });
    }
    if (!usuario) {
      // Utilizador ainda não existe no OS — retorna 503 para forçar retry no remetente.
      // Isso garante que password_sync chegando antes de usuario.upsert seja reaplicado.
      console.warn(`[webhook usuario] password_sync: usuário ${data.id} não encontrado, retornando 503 para retry.`);
      return NextResponse.json({ error: "usuario_not_found_retry" }, { status: 503 });
    }

    const hashed = await bcrypt.hash(data.newPassword, 10);
    await prisma.usuario.update({
      where: { id: usuario.id },
      data: { senha: hashed, primeiroAcesso: false, sincronizadoEm: new Date() },
    });
    return NextResponse.json({ ok: true });
  }

  // ── Upsert normal ─────────────────────────────────────────────────────────
  if (event !== "usuario.upsert") {
    return NextResponse.json({ error: "evento não suportado" }, { status: 400 });
  }

  if (!data.email && !data.username) {
    return NextResponse.json({ error: "email ou username obrigatório" }, { status: 400 });
  }

  const setor = await prisma.setor.findFirst({ where: { tipo: "CONTABIL" } });
  if (!setor) {
    console.error("[webhook usuario] Setor CONTABIL não encontrado");
    return NextResponse.json({ error: "Setor CONTABIL ausente" }, { status: 500 });
  }

  const role = mapContabilRoleToOs(data.role);
  const nome = data.nome?.trim() || "Utilizador";
  // Se `ativo` não vier no payload, preserva o estado atual no OS (undefined = não alterar no update)
  const ativo = data.ativo !== undefined ? data.ativo !== false : undefined;
  const senha = await getSyncPasswordHash();
  const cargoBits = [data.team, data.subteam].filter(Boolean).join(" · ");

  await prisma.usuario.upsert({
    where: { id: data.id },
    create: {
      // Usuário novo: inicializa com senha placeholder (será atualizada via password_sync)
      id: data.id,
      email: data.email?.trim().toLowerCase() || `${data.username?.trim().toLowerCase() || data.id}@pktech.internal`,
      username: data.username?.trim().toLowerCase() ?? undefined,
      nome,
      senha,
      role,
      setorId: setor.id,
      ativo,
      origemContabilPro: true,
      sincronizadoEm: new Date(),
      cargo: cargoBits || null,
    },
    update: {
      // Usuário EXISTENTE: nunca sobrescreve senha — o usuário pode já ter definido
      // uma senha própria no OS. A senha só muda via evento password_sync.
      // ativo undefined = preserva estado manual do OS (não altera)
      email: data.email?.trim().toLowerCase() || `${data.username?.trim().toLowerCase() || data.id}@pktech.internal`,
      username: data.username?.trim().toLowerCase() ?? undefined,
      nome,
      role,
      ...(ativo !== undefined ? { ativo } : {}),
      origemContabilPro: true,
      sincronizadoEm: new Date(),
      cargo: cargoBits || null,
    },
  });

  return NextResponse.json({ ok: true });
}
