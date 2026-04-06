import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";
import { StatusChamado } from "@prisma/client";

export type MetricaResponsavel = {
  usuarioId: string;
  nome: string;
  email: string;
  setorNome: string;
  /** Chamados (como responsável) criados no período */
  chamadosNoPeriodo: number;
  /** Concluídos no período (com prazo definido) */
  concluidosComPrazo: number;
  concluidosNoPrazo: number;
  concluidosForaDoPrazo: number;
  taxaNoPrazoPct: number | null;
  taxaAtrasoPct: number | null;
};

function pct(part: number, total: number): number | null {
  if (total <= 0) return null;
  return Math.round((part / total) * 1000) / 10;
}

/**
 * Métricas por responsável no período. SUPERADMIN: todos os setores.
 * GESTOR: apenas chamados com destino ao setor do gestor.
 */
export async function getMetricasPorResponsavel({
  viewerRole,
  viewerSetorId,
  dias = 30,
}: {
  viewerRole: Role;
  viewerSetorId: string;
  dias?: number;
}): Promise<MetricaResponsavel[]> {
  if (viewerRole !== "SUPERADMIN" && viewerRole !== "GESTOR") {
    return [];
  }

  const desde = new Date();
  desde.setDate(desde.getDate() - dias);

  const setorDestinoFilter =
    viewerRole === "GESTOR" ? { setorDestinoId: viewerSetorId } : {};

  const usuarios = await prisma.usuario.findMany({
    where:
      viewerRole === "SUPERADMIN"
        ? {
            ativo: true,
            role: { in: ["ANALISTA", "GESTOR", "SAC"] },
          }
        : {
            ativo: true,
            setorId: viewerSetorId,
            role: { in: ["ANALISTA", "GESTOR", "SAC"] },
          },
    select: {
      id: true,
      nome: true,
      email: true,
      setor: { select: { nome: true } },
    },
    orderBy: [{ setor: { nome: "asc" } }, { nome: "asc" }],
  });

  const [criadosAgg, concluidosRows] = await Promise.all([
    prisma.chamado.groupBy({
      by: ["responsavelId"],
      where: {
        ...setorDestinoFilter,
        criadoEm: { gte: desde },
      },
      _count: { _all: true },
    }),
    prisma.chamado.findMany({
      where: {
        ...setorDestinoFilter,
        status: StatusChamado.CONCLUIDO,
        concluidoEm: { gte: desde },
        prazoSla: { not: null },
      },
      select: {
        responsavelId: true,
        concluidoEm: true,
        prazoSla: true,
      },
    }),
  ]);

  const criadosMap = new Map(
    criadosAgg.map((r) => [r.responsavelId, r._count._all])
  );

  const concluidosMap = new Map<
    string,
    { comPrazo: number; noPrazo: number; fora: number }
  >();

  for (const c of concluidosRows) {
    if (!c.concluidoEm || !c.prazoSla) continue;
    const cur = concluidosMap.get(c.responsavelId) ?? {
      comPrazo: 0,
      noPrazo: 0,
      fora: 0,
    };
    cur.comPrazo++;
    if (c.concluidoEm.getTime() <= c.prazoSla.getTime()) cur.noPrazo++;
    else cur.fora++;
    concluidosMap.set(c.responsavelId, cur);
  }

  return usuarios.map((u) => {
    const ch = criadosMap.get(u.id) ?? 0;
    const co = concluidosMap.get(u.id);
    const comPrazo = co?.comPrazo ?? 0;
    const noPrazo = co?.noPrazo ?? 0;
    const fora = co?.fora ?? 0;
    const denom = noPrazo + fora;
    return {
      usuarioId: u.id,
      nome: u.nome,
      email: u.email,
      setorNome: u.setor.nome,
      chamadosNoPeriodo: ch,
      concluidosComPrazo: comPrazo,
      concluidosNoPrazo: noPrazo,
      concluidosForaDoPrazo: fora,
      taxaNoPrazoPct: pct(noPrazo, denom),
      taxaAtrasoPct: pct(fora, denom),
    };
  });
}
