import type { Urgencia, Impacto, Prioridade } from "@prisma/client";

// ─── Matriz GLPI: Urgência × Impacto → Prioridade ────────────────────────────
//
// Reproduz a lógica do GLPI (https://glpi-project.org):
//   Prioridade = média ponderada de urgência (60%) + impacto (40%)
//   Resultado mapeado para os 4 níveis do sistema

const PESO: Record<string, number> = {
  MUITO_BAIXA: 1,
  BAIXA:       2,
  MEDIA:       3,
  ALTA:        4,
  MUITO_ALTA:  5,
  MUITO_BAIXO: 1,
  BAIXO:       2,
  MEDIO:       3,
  ALTO:        4,
  MUITO_ALTO:  5,
};

export function calcularPrioridade(
  urgencia: Urgencia,
  impacto: Impacto
): Prioridade {
  const score = PESO[urgencia] * 0.6 + PESO[impacto] * 0.4;

  if (score >= 4.2) return "CRITICA";
  if (score >= 3.0) return "ALTA";
  if (score >= 2.0) return "MEDIA";
  return "BAIXA";
}

// Labels para exibição
export const URGENCIA_LABELS: Record<Urgencia, string> = {
  MUITO_BAIXA: "Muito Baixa",
  BAIXA:       "Baixa",
  MEDIA:       "Média",
  ALTA:        "Alta",
  MUITO_ALTA:  "Muito Alta",
};

export const IMPACTO_LABELS: Record<Impacto, string> = {
  MUITO_BAIXO: "Muito Baixo",
  BAIXO:       "Baixo",
  MEDIO:       "Médio",
  ALTO:        "Alto",
  MUITO_ALTO:  "Muito Alto",
};

export const TIPO_CHAMADO_LABELS = {
  INCIDENTE:   "Incidente",
  SOLICITACAO: "Solicitação de Serviço",
} as const;

export const TIPO_CHAMADO_DESC = {
  INCIDENTE:   "Algo parou de funcionar ou está incorreto",
  SOLICITACAO: "Pedido de novo serviço ou demanda planejada",
} as const;
