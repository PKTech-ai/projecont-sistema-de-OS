import { prisma } from "@/lib/prisma";
import { StatusChamado } from "@prisma/client";
import type { Role } from "@prisma/client";
import { diasUteisEntre } from "@/lib/sla";

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

  const [abertos, emAndamento, aguardando, concluidosHoje, vencendoSla] =
    await Promise.all([
      prisma.chamado.count({ where: { ...baseWhere, status: StatusChamado.ABERTO } }),
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
    ]);

  return { abertos, emAndamento, aguardando, concluidosHoje, vencendoSla };
}

export async function getMeusChamados(userId: string, role?: Role) {
  const where = role === "SUPERADMIN"
    ? { status: { notIn: [StatusChamado.CONCLUIDO, StatusChamado.CANCELADO] as StatusChamado[] } }
    : {
        OR: [{ solicitanteId: userId }, { responsavelId: userId }] as { solicitanteId?: string; responsavelId?: string }[],
        status: { notIn: [StatusChamado.CONCLUIDO, StatusChamado.CANCELADO] as StatusChamado[] },
      };
  const results = await prisma.chamado.findMany({
    where,
    include: {
      solicitante: { select: { nome: true } },
      responsavel: { select: { nome: true } },
      empresa: { select: { nome: true } },
      projeto: { select: { nome: true } },
    },
    orderBy: [{ prioridade: "desc" }, { criadoEm: "desc" }],
    take: 10,
  });
  // #region agent log
  fetch('http://127.0.0.1:7448/ingest/adf8baf6-2bfb-4ba5-b401-76fc30788b1a',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'197317'},body:JSON.stringify({sessionId:'197317',location:'queries/dashboard.ts:getMeusChamados',message:'query result',data:{userId,count:results.length,ids:results.map(r=>r.id)},timestamp:Date.now(),hypothesisId:'H-B'})}).catch(()=>{});
  // #endregion
  return results;
}

export async function getChamadosSetor(setorId: string) {
  return prisma.chamado.findMany({
    where: {
      status: { notIn: [StatusChamado.CONCLUIDO, StatusChamado.CANCELADO] },
      OR: [
        { solicitante: { setorId } },
        { responsavel: { setorId } },
      ],
    },
    include: {
      solicitante: { select: { nome: true } },
      responsavel: { select: { nome: true } },
      empresa: { select: { nome: true } },
      projeto: { select: { nome: true } },
    },
    orderBy: [{ prioridade: "desc" }, { criadoEm: "desc" }],
  });
}

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
        { solicitante: { setorId } },
        { responsavel: { setorId } },
      ],
    };
  }
  return {
    OR: [{ solicitanteId: userId }, { responsavelId: userId }],
  };
}
