import { prisma } from "@/lib/prisma";
import { diasUteisEntre } from "@/lib/sla";
import { StatusChamado } from "@prisma/client";

const SLA_HORAS_UTEIS_AUTO_FECHAR = 48;

export async function executarAutoFechamento(): Promise<{
  processados: number;
  erros: string[];
}> {
  const erros: string[] = [];
  let processados = 0;

  const candidatos = await prisma.chamado.findMany({
    where: {
      status: StatusChamado.AGUARDANDO_VALIDACAO,
      entregueEm: { not: null },
    },
    select: {
      id: true,
      entregueEm: true,
      solicitanteId: true,
      responsavelId: true,
    },
  });

  for (const chamado of candidatos) {
    try {
      const diasDecorridos = diasUteisEntre(chamado.entregueEm!, new Date());

      if (diasDecorridos < SLA_HORAS_UTEIS_AUTO_FECHAR / 24) continue;

      await prisma.$transaction(async (tx) => {
        await tx.chamado.update({
          where: { id: chamado.id },
          data: {
            status: StatusChamado.CONCLUIDO,
            autoFechado: true,
            concluidoEm: new Date(),
          },
        });

        // Usar SUPERADMIN como ator de sistema — buscar qualquer SUPERADMIN
        const superAdmin = await tx.usuario.findFirst({
          where: { role: "SUPERADMIN" },
          select: { id: true },
        });

        if (!superAdmin) throw new Error("Nenhum SUPERADMIN encontrado para log de sistema");

        await tx.historicoStatus.create({
          data: {
            statusAntes: StatusChamado.AGUARDANDO_VALIDACAO,
            statusDepois: StatusChamado.CONCLUIDO,
            chamadoId: chamado.id,
            atorId: superAdmin.id,
            justificativa: `Auto-fechado após ${SLA_HORAS_UTEIS_AUTO_FECHAR} horas úteis sem validação`,
          },
        });

        const notificacoes = [
          { tipo: "AUTO_FECHADO", usuarioId: chamado.solicitanteId },
        ];
        if (chamado.responsavelId) {
          notificacoes.push({ tipo: "AUTO_FECHADO", usuarioId: chamado.responsavelId });
        }

        await tx.notificacao.createMany({
          data: notificacoes.map((n) => ({
            tipo: n.tipo,
            usuarioId: n.usuarioId,
            chamadoId: chamado.id,
          })),
        });
      });

      processados++;
    } catch (err) {
      erros.push(`Chamado ${chamado.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return { processados, erros };
}
