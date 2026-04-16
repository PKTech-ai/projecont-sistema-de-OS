import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertWebhookSecret } from "@/lib/webhook-auth";

type EmpresaPayload = {
  id: string;
  cnpj: string;
  nome: string;
  razaoSocial?: string | null;
  fiscalResponsavelId?: string | null;
  rhResponsavelId?: string | null;
  societarioResponsavelId?: string | null;
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

  // 1. Procurar empresa por ID ou por CNPJ para resolver conflitos de sincronismo
  let existingEmpresa = await prisma.empresa.findUnique({ where: { id: data.id } });
  
  if (!existingEmpresa) {
    existingEmpresa = await prisma.empresa.findUnique({ where: { cnpj } });
  }

  // Se a empresa existir com ID diferente mas mesmo CNPJ, precisamos reconciliar o ID se possível
  // ou apenas atualizar o registro existente.
  const targetId = existingEmpresa ? existingEmpresa.id : data.id;

  const empresa = await prisma.empresa.upsert({
    where: { id: targetId },
    create: {
      id: targetId,
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


  // Novos os Vínculos de Responsáveis
  const responsabilidades = [
    { id: data.fiscalResponsavelId, tipo: "FISCAL" },
    { id: data.rhResponsavelId, tipo: "DP" },
    { id: data.societarioResponsavelId, tipo: "SOCIETARIO" },
  ];

  for (const res of responsabilidades) {
    if (res.id) {
      // Verifica se o usuário existe no OS
      const usuario = await prisma.usuario.findUnique({ where: { id: res.id } });
      if (usuario) {
        await prisma.vinculoEmpresa.upsert({
          where: {
            empresaId_tipoServico: {
              empresaId: empresa.id,
              tipoServico: res.tipo,
            },
          },
          create: {
            empresaId: empresa.id,
            tipoServico: res.tipo,
            responsavelId: usuario.id,
          },
          update: {
            responsavelId: usuario.id,
          },
        });
      }
    }
  }

  return NextResponse.json({ ok: true });
}
