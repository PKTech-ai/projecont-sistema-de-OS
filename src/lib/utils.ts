import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { StatusChamado, Prioridade } from "@prisma/client";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date));
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export const STATUS_LABELS: Record<StatusChamado, string> = {
  NAO_INICIADO: "Não iniciado",
  EM_ANDAMENTO: "Em Andamento",
  AGUARDANDO_VALIDACAO: "Aguardando Validação",
  CONCLUIDO: "Concluído",
  CANCELADO: "Cancelado",
};

export const PRIORIDADE_LABELS: Record<Prioridade, string> = {
  BAIXA: "Baixa",
  MEDIA: "Média",
  ALTA: "Alta",
  CRITICA: "Crítica",
};

/** Design system v2 — badges semânticos (success / warning / danger / info) */
export const STATUS_COLORS: Record<StatusChamado, string> = {
  NAO_INICIADO: "bg-ds-info-bg text-ds-info-fg border-ds-pebble",
  EM_ANDAMENTO: "bg-ds-warning-bg text-ds-warning-fg border-ds-pebble",
  AGUARDANDO_VALIDACAO: "bg-ds-linen text-ds-charcoal border-ds-pebble",
  CONCLUIDO: "bg-ds-success-bg text-ds-success-fg border-ds-pebble",
  CANCELADO: "bg-ds-linen text-ds-ash border-ds-pebble",
};

export const PRIORIDADE_COLORS: Record<Prioridade, string> = {
  BAIXA: "bg-ds-success-bg text-ds-success-fg border-ds-pebble",
  MEDIA: "bg-ds-warning-bg text-ds-warning-fg border-ds-pebble",
  ALTA: "bg-orange-100 text-orange-900 border-ds-pebble",
  CRITICA: "bg-ds-danger-bg text-ds-danger-fg border-ds-pebble",
};
