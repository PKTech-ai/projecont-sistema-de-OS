import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/cron/reconcile-vinculos
 *
 * Cria vínculos empresa × responsável que ficaram pendentes porque o usuário
 * do Contábil Pro ainda não existia no OS quando o webhook de empresa chegou.
 *
 * Deve ser chamado após cada rodada de sync de usuários (sync-all-to-os.mjs)
 * ou periodicamente via cron (a cada hora é suficiente).
 *
 * Autenticação: Authorization: Bearer <CRON_SECRET>
 */
export async function POST(req: NextRequest) {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json({ error: "CRON_SECRET não configurado" }, { status: 501 });
  }
  if (req.headers.get("authorization") !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Busca todas as empresas que têm IDs de responsáveis salvos do Contábil Pro
  const empresas = await prisma.empresa.findMany({
    where: {
      origemContabilPro: true,
      OR: [
        { fiscalContabilId: { not: null } },
        { rhContabilId: { not: null } },
        { societarioContabilId: { not: null } },
      ],
    },
    select: {
      id: true,
      nome: true,
      fiscalContabilId: true,
      rhContabilId: true,
      societarioContabilId: true,
    },
  });

  const mapa = [
    { campo: "fiscalContabilId" as const, tipo: "FISCAL" },
    { campo: "rhContabilId" as const, tipo: "DP" },
    { campo: "societarioContabilId" as const, tipo: "SOCIETARIO" },
  ];

  let criados = 0;
  let pendentes = 0;
  const detalhes: string[] = [];

  for (const empresa of empresas) {
    for (const { campo, tipo } of mapa) {
      const responsavelId = empresa[campo];
      if (!responsavelId) continue;

      // Verifica se o vínculo já existe
      const vinculoExistente = await prisma.vinculoEmpresa.findUnique({
        where: { empresaId_tipoServico: { empresaId: empresa.id, tipoServico: tipo } },
      });
      if (vinculoExistente) continue;

      // Tenta encontrar o usuário pelo ID do Contábil Pro
      const usuario = await prisma.usuario.findUnique({ where: { id: responsavelId } });
      if (!usuario) {
        pendentes++;
        continue;
      }

      await prisma.vinculoEmpresa.create({
        data: { empresaId: empresa.id, tipoServico: tipo, responsavelId: usuario.id },
      });
      criados++;
      detalhes.push(`${empresa.nome} (${tipo}) → ${usuario.nome}`);
    }
  }

  console.log(`[reconcile-vinculos] criados=${criados} ainda_pendentes=${pendentes}`);

  return NextResponse.json({
    ok: true,
    empresasVerificadas: empresas.length,
    vinculosCriados: criados,
    vinculosAindaPendentes: pendentes,
    detalhes,
  });
}
