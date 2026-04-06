import type { Prioridade } from "@prisma/client";

export const TIPO_CHAMADO_LABELS = {
  INCIDENTE:   "Incidente",
  SOLICITACAO: "Solicitação de Serviço",
} as const;

export const TIPO_CHAMADO_DESC = {
  INCIDENTE:   "Algo parou de funcionar ou está incorreto",
  SOLICITACAO: "Pedido de novo serviço ou demanda planejada",
} as const;

/** Prazo fixo em horas úteis (seg–sex, 9h–17h) por prioridade — não negociável no formulário */
export const PRAZO_HORAS_UTEIS_POR_PRIORIDADE: Record<Prioridade, number> = {
  CRITICA: 4,
  ALTA: 8,
  MEDIA: 24,
  BAIXA: 48,
};

/** @deprecated use PRAZO_HORAS_UTEIS_POR_PRIORIDADE */
export const SLA_HORAS_UTEIS_POR_PRIORIDADE = PRAZO_HORAS_UTEIS_POR_PRIORIDADE;

export type PrioridadeGuiaItem = {
  prioridade: Prioridade;
  titulo: string;
  quandoUsar: string;
  prazoHorasUteis: number;
};

/** Textos para orientar o solicitante (poucas opções, regra clara) */
export const PRIORIDADE_GUIA: PrioridadeGuiaItem[] = [
  {
    prioridade: "BAIXA",
    titulo: "Baixa",
    quandoUsar:
      "Melhoria ou dúvida que pode esperar sem atrapalhar o trabalho de hoje. Ex.: sugestão de relatório, ajuste cosmético, dúvida que você consegue contornar.",
    prazoHorasUteis: PRAZO_HORAS_UTEIS_POR_PRIORIDADE.BAIXA,
  },
  {
    prioridade: "MEDIA",
    titulo: "Média",
    quandoUsar:
      "Importante, mas dá para se organizar em alguns dias. Ex.: correção que não paralisa a operação, pedido com prazo ainda folgado.",
    prazoHorasUteis: PRAZO_HORAS_UTEIS_POR_PRIORIDADE.MEDIA,
  },
  {
    prioridade: "ALTA",
    titulo: "Alta",
    quandoUsar:
      "Impacta o trabalho de hoje ou de clientes e precisa tratamento no mesmo dia útil. Ex.: erro que impede lançamento, prazo fiscal curto, fila de atendimento prejudicada.",
    prazoHorasUteis: PRAZO_HORAS_UTEIS_POR_PRIORIDADE.ALTA,
  },
  {
    prioridade: "CRITICA",
    titulo: "Crítica",
    quandoUsar:
      "Parada forte, risco imediato ou bloqueio severo para a empresa ou vários clientes. Ex.: sistema parado para muita gente, impossibilidade de cumprir obrigação hoje. Use só no que é realmente urgente.",
    prazoHorasUteis: PRAZO_HORAS_UTEIS_POR_PRIORIDADE.CRITICA,
  },
];
