import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertWebhookSecret } from "@/lib/webhook-auth";

type EmpresaPayload = {
  id: string;
  cnpj: string;
  nome: string;
  razaoSocial?: string | null;
  ativo?: boolean;
};

export async function POST(request: NextRequest) {
  const denied = assertWebhookSecret(request);
  if (denied) return denied;

  let body: { event?: string; data?: EmpresaPayload & { id?: string } };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { event, data } = body;
  if (!data?.id) {
    return NextResponse.json({ error: "data.id obrigatório" }, { status: 400 });
  }

  if (event === "empresa.deleted") {
    await prisma.empresa.updateMany({
      where: { id: data.id },
      data: { ativo: false, sincronizadoEm: new Date() },
    });
    return NextResponse.json({ ok: true });
  }

  if (event !== "empresa.upsert") {
    return NextResponse.json({ error: "evento não suportado" }, { status: 400 });
  }

  const cnpj = String(data.cnpj || "").replace(/\D/g, "");
  if (cnpj.length !== 14) {
    return NextResponse.json({ error: "cnpj inválido (14 dígitos)" }, { status: 400 });
  }

  const nome = data.nome?.trim() || "Empresa";
  const razaoSocial = data.razaoSocial?.trim() || nome;
  const ativo = data.ativo !== false;

  await prisma.empresa.upsert({
    where: { id: data.id },
    create: {
      id: data.id,
      nome,
      cnpj,
      razaoSocial,
      ativo,
      origemContabilPro: true,
      sincronizadoEm: new Date(),
    },
    update: {
      nome,
      cnpj,
      razaoSocial,
      ativo,
      origemContabilPro: true,
      sincronizadoEm: new Date(),
    },
  });

  return NextResponse.json({ ok: true });
}
