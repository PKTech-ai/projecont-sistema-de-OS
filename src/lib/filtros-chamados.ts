import type { Prioridade, StatusChamado } from "@prisma/client";

export type FiltroPrazoLista = "TODOS" | "DENTRO" | "ATRASADO";

export type FiltrosListaChamados = {
  status: StatusChamado | "TODOS";
  prioridade: Prioridade | "TODOS";
  prazo: FiltroPrazoLista;
};

export const FILTROS_PADRAO_DASHBOARD: FiltrosListaChamados = {
  status: "TODOS",
  prioridade: "TODOS",
  prazo: "TODOS",
};

export function parseFiltrosChamados(
  raw: Record<string, string | string[] | undefined>
): FiltrosListaChamados {
  const st = typeof raw.status === "string" ? raw.status : "TODOS";
  const pr = typeof raw.prioridade === "string" ? raw.prioridade : "TODOS";
  const pz = typeof raw.prazo === "string" ? raw.prazo : "TODOS";

  const statusVals: (StatusChamado | "TODOS")[] = [
    "TODOS",
    "NAO_INICIADO",
    "EM_ANDAMENTO",
    "AGUARDANDO_VALIDACAO",
    "CONCLUIDO",
    "CANCELADO",
  ];
  const priorVals: (Prioridade | "TODOS")[] = [
    "TODOS",
    "BAIXA",
    "MEDIA",
    "ALTA",
    "CRITICA",
  ];
  const prazoVals: FiltroPrazoLista[] = ["TODOS", "DENTRO", "ATRASADO"];

  return {
    status: statusVals.includes(st as StatusChamado | "TODOS")
      ? (st as StatusChamado | "TODOS")
      : "TODOS",
    prioridade: priorVals.includes(pr as Prioridade | "TODOS")
      ? (pr as Prioridade | "TODOS")
      : "TODOS",
    prazo: prazoVals.includes(pz as FiltroPrazoLista) ? (pz as FiltroPrazoLista) : "TODOS",
  };
}
