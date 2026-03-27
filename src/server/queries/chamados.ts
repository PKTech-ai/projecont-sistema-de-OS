import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";
import { StatusChamado } from "@prisma/client";

export async function getChamados({
  userId,
  role,
  setorId,
  statusFilter,
  page = 1,
  pageSize = 20,
}: {
  userId: string;
  role: Role;
  setorId: string;
  statusFilter?: StatusChamado;
  page?: number;
  pageSize?: number;
}) {
  const where: Record<string, unknown> = {};

  if (statusFilter) where.status = statusFilter;

  if (role === "ANALISTA") {
    where.OR = [{ solicitanteId: userId }, { responsavelId: userId }];
  } else if (role === "GESTOR") {
    // Gestor vê todos os chamados do setor (como solicitante ou responsável)
    where.OR = [
      { solicitante: { setorId } },
      { responsavel: { setorId } },
    ];
  }
  // SUPERADMIN vê tudo — sem filtro adicional

  const [chamados, total] = await Promise.all([
    prisma.chamado.findMany({
      where,
      include: {
        solicitante: { select: { id: true, nome: true, setor: true } },
        responsavel: { select: { id: true, nome: true, setor: true } },
        empresa: { select: { id: true, nome: true } },
        projeto: { select: { id: true, nome: true } },
      },
      orderBy: [{ prioridade: "desc" }, { criadoEm: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.chamado.count({ where }),
  ]);

  return { chamados, total, pages: Math.ceil(total / pageSize) };
}

export async function getChamadoById(id: string) {
  const result = await prisma.chamado.findUnique({
    where: { id },
    include: {
      solicitante: { include: { setor: true } },
      responsavel: { include: { setor: true } },
      empresa: true,
      projeto: { include: { setor: true } },
      setorDestino: true,
      comentarios: {
        include: { autor: { select: { id: true, nome: true, role: true } } },
        orderBy: { criadoEm: "asc" },
      },
      historicoStatus: {
        include: { ator: { select: { id: true, nome: true, role: true } } },
        orderBy: { criadoEm: "asc" },
      },
      notificacoes: true,
    },
  });
  // #region agent log
  fetch('http://127.0.0.1:7448/ingest/adf8baf6-2bfb-4ba5-b401-76fc30788b1a',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'197317'},body:JSON.stringify({sessionId:'197317',location:'queries/chamados.ts:getChamadoById',message:'chamado fields',data:{id:result?.id,urgencia:result?.urgencia,impacto:result?.impacto,tipo:result?.tipo,solucao:result?.solucao},timestamp:Date.now(),hypothesisId:'H-A'})}).catch(()=>{});
  // #endregion
  return result;
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
