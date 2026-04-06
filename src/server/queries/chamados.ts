import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";
import { StatusChamado } from "@prisma/client";
import type { FiltrosListaChamados } from "@/lib/filtros-chamados";
import { mergeFiltrosLista } from "@/server/queries/chamado-lista-filtros";

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

  if (role === "ANALISTA" || role === "SAC") {
    where.OR = [{ solicitanteId: userId }, { responsavelId: userId }];
  } else if (role === "GESTOR") {
    // Fila do setor (destino) + chamados em que o gestor é parte
    where.OR = [
      { setorDestinoId: setorId },
      { solicitanteId: userId },
      { responsavelId: userId },
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
      anexos: {
        include: { autor: { select: { id: true, nome: true, role: true } } },
        orderBy: { criadoEm: "asc" },
      },
      notificacoes: true,
    },
  });
  return result;
}

const filtroPadraoLista: FiltrosListaChamados = {
  status: "TODOS",
  prioridade: "TODOS",
  prazo: "TODOS",
};

export async function getChamadosSetor(setorId: string, filtros?: FiltrosListaChamados) {
  const base = { setorDestinoId: setorId };
  const where = mergeFiltrosLista(base, filtros ?? filtroPadraoLista);
  return prisma.chamado.findMany({
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
}
