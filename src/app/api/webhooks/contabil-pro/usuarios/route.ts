import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertWebhookSecret } from "@/lib/webhook-auth";
import { mapContabilRoleToOs } from "@/lib/contabil-role-map";
import { getSyncPasswordHash } from "@/lib/contabil-sync-placeholder";

type UsuarioPayload = {
  id: string;
  email: string;
  nome: string;
  role?: string;
  team?: string | null;
  subteam?: string | null;
  ativo?: boolean;
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
  if (!data?.id || !data.email) {
    return NextResponse.json({ error: "data.id e data.email obrigatórios" }, { status: 400 });
  }

  if (event === "usuario.deleted") {
    await prisma.usuario.updateMany({
      where: { id: data.id },
      data: { ativo: false, sincronizadoEm: new Date() },
    });
    return NextResponse.json({ ok: true });
  }

  if (event !== "usuario.upsert") {
    return NextResponse.json({ error: "evento não suportado" }, { status: 400 });
  }

  const setor = await prisma.setor.findFirst({ where: { tipo: "CONTABIL" } });
  if (!setor) {
    console.error("[webhook usuario] Setor CONTABIL não encontrado");
    return NextResponse.json({ error: "Setor CONTABIL ausente" }, { status: 500 });
  }

  const role = mapContabilRoleToOs(data.role);
  const nome = data.nome?.trim() || "Utilizador";
  const ativo = data.ativo !== false;
  const senha = await getSyncPasswordHash();

  const cargoBits = [data.team, data.subteam].filter(Boolean).join(" · ");

  await prisma.usuario.upsert({
    where: { id: data.id },
    create: {
      id: data.id,
      email: data.email.trim().toLowerCase(),
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
      email: data.email.trim().toLowerCase(),
      nome,
      senha,
      role,
      ativo,
      origemContabilPro: true,
      sincronizadoEm: new Date(),
      cargo: cargoBits || null,
    },
  });

  return NextResponse.json({ ok: true });
}
