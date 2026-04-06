import type { TipoMensagemChat } from "@prisma/client";

/** Rótulos curtos para UI e futura base de conhecimento */
export const TIPO_MENSAGEM_LABEL: Record<TipoMensagemChat, string> = {
  NORMAL: "Mensagem",
  ACAO_SOLICITANTE: "Ação necessária",
  RESOLUCAO: "Resolução",
};

export const TIPO_MENSAGEM_HINT: Record<TipoMensagemChat, string> = {
  NORMAL: "Comunicação geral no andamento do chamado.",
  ACAO_SOLICITANTE:
    "Peça algo ao solicitante antes de continuar (ex.: enviar documento). Aparece em destaque amarelo.",
  RESOLUCAO:
    "Descreva a solução aplicada — útil para relatórios e futura base de conhecimento. Destaque verde.",
};

/** Estilo do cartão da mensagem (não copia visual de terceiros; só semântica por cor) */
export function estiloBubbleComentario(tipo: TipoMensagemChat, isLadoAtendimento: boolean) {
  if (tipo === "RESOLUCAO") {
    return {
      shell: "border-emerald-200 bg-emerald-50/95 shadow-sm",
      headerBar: "bg-emerald-100/90 text-emerald-950 border-emerald-200/80",
      badge: "text-emerald-800",
    };
  }
  if (tipo === "ACAO_SOLICITANTE") {
    return {
      shell: "border-amber-200 bg-amber-50/95 shadow-sm",
      headerBar: "bg-amber-100/90 text-amber-950 border-amber-200/80",
      badge: "text-amber-900",
    };
  }
  return {
    shell: isLadoAtendimento ? "border-ds-info/35 bg-ds-info-bg/60" : "border-ds-pebble bg-white",
    headerBar: "bg-ds-linen/90 text-ds-ash border-ds-pebble",
    badge: "text-ds-charcoal",
  };
}
