import { prisma } from "@/lib/prisma";
import { StatusChamado } from "@prisma/client";
import type { Role } from "@prisma/client";
import type { FiltrosListaChamados } from "@/lib/filtros-chamados";
import { mergeFiltrosLista } from "@/server/queries/chamado-lista-filtros";

export async function getKPIs({
  userId,
  role,
  setorId,
}: {
  userId: string;
  role: Role;
  setorId: string;
}) {
  const baseWhere = buildBaseWhere({ userId, role, setorId });
  const desde30d = new Date();
  desde30d.setDate(desde30d.getDate() - 30);

  const [naoIniciados, emAndamento, aguardando, concluidosHoje, vencendoPrazo, concluidos30dPunct] =
    await Promise.all([
      prisma.chamado.count({ where: { ...baseWhere, status: StatusChamado.NAO_INICIADO } }),
      prisma.chamado.count({ where: { ...baseWhere, status: StatusChamado.EM_ANDAMENTO } }),
      prisma.chamado.count({ where: { ...baseWhere, status: StatusChamado.AGUARDANDO_VALIDACAO } }),
      prisma.chamado.count({
        where: {
          ...baseWhere,
          status: StatusChamado.CONCLUIDO,
          concluidoEm: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
      prisma.chamado.count({
        where: {
          ...baseWhere,
          status: { notIn: [StatusChamado.CONCLUIDO, StatusChamado.CANCELADO] },
          prazoSla: { lte: new Date(Date.now() + 24 * 60 * 60 * 1000) },
        },
      }),
      prisma.chamado.findMany({
        where: {
          ...baseWhere,
          status: StatusChamado.CONCLUIDO,
          concluidoEm: { gte: desde30d },
          prazoSla: { not: null },
        },
        select: { concluidoEm: true, prazoSla: true },
      }),
    ]);

  let conclusoesNoPrazo30d = 0;
  let conclusoesForaPrazo30d = 0;
  for (const c of concluidos30dPunct) {
    if (!c.concluidoEm || !c.prazoSla) continue;
    if (c.concluidoEm.getTime() <= c.prazoSla.getTime()) conclusoesNoPrazo30d++;
    else conclusoesForaPrazo30d++;
  }

  return {
    naoIniciados,
    emAndamento,
    aguardando,
    concluidosHoje,
    vencendoPrazo,
    conclusoesNoPrazo30d,
    conclusoesForaPrazo30d,
  };
}

export async function getMeusChamados(
  userId: string,
  role?: Role,
  setorId?: string,
  filtros?: FiltrosListaChamados
) {
  const base =
    role === "SUPERADMIN"
      ? {}
      : role === "GESTOR" && setorId
        ? {
            OR: [
              { solicitanteId: userId },
              { responsavelId: userId },
              { setorDestinoId: setorId },
            ],
          }
        : {
            OR: [{ solicitanteId: userId }, { responsavelId: userId }],
          };
  const padrao: FiltrosListaChamados = {
    status: "TODOS",
    prioridade: "TODOS",
    prazo: "TODOS",
  };
  const where = mergeFiltrosLista(base, filtros ?? padrao);
  const results = await prisma.chamado.findMany({
    where,
    include: {
      solicitante: { select: { nome: true } },
      responsavel: { select: { nome: true } },
      empresa: { select: { nome: true } },
      projeto: { select: { nome: true } },
    },
    orderBy: [{ prioridade: "desc" }, { criadoEm: "desc" }],
    take: 25,
  });
  return results;
}

export { getChamadosSetor } from "./chamados";

export async function getNotificacoes(userId: string) {
  return prisma.notificacao.findMany({
    where: { usuarioId: userId },
    include: {
      chamado: { select: { id: true, titulo: true, status: true } },
    },
    orderBy: { criadoEm: "desc" },
    take: 10,
  });
}

export async function marcarNotificacaoLida(id: string) {
  return prisma.notificacao.update({ where: { id }, data: { lida: true } });
}

function buildBaseWhere({
  userId,
  role,
  setorId,
}: {
  userId: string;
  role: Role;
  setorId: string;
}) {
  if (role === "SUPERADMIN") return {};
  if (role === "GESTOR") {
    return {
      OR: [
        { setorDestinoId: setorId },
        { solicitanteId: userId },
        { responsavelId: userId },
      ],
    };
  }
  return {
    OR: [{ solicitanteId: userId }, { responsavelId: userId }],
  };
}
