import type { Prisma } from "@prisma/client";
import { StatusChamado } from "@prisma/client";
import type { FiltrosListaChamados } from "@/lib/filtros-chamados";

/** Combina escopo base (meu/setor) com filtros de lista do dashboard. */
export function mergeFiltrosLista(
  base: Prisma.ChamadoWhereInput,
  filtros: FiltrosListaChamados
): Prisma.ChamadoWhereInput {
  const now = new Date();
  const parts: Prisma.ChamadoWhereInput[] = [base];

  if (filtros.prazo === "ATRASADO") {
    parts.push({ prazoSla: { lt: now } });
    parts.push({ status: { notIn: [StatusChamado.CONCLUIDO, StatusChamado.CANCELADO] } });
  } else {
    if (filtros.status !== "TODOS") {
      parts.push({ status: filtros.status });
    } else {
      parts.push({ status: { notIn: [StatusChamado.CONCLUIDO, StatusChamado.CANCELADO] } });
    }
    if (filtros.prazo === "DENTRO") {
      parts.push({ prazoSla: { gte: now } });
    }
  }

  if (filtros.prioridade !== "TODOS") {
    parts.push({ prioridade: filtros.prioridade });
  }

  return { AND: parts };
}
