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
  ABERTO: "Aberto",
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

export const STATUS_COLORS: Record<StatusChamado, string> = {
  ABERTO: "bg-blue-100 text-blue-700 border-blue-200",
  EM_ANDAMENTO: "bg-yellow-100 text-yellow-800 border-yellow-200",
  AGUARDANDO_VALIDACAO: "bg-purple-100 text-purple-800 border-purple-200",
  CONCLUIDO: "bg-green-100 text-green-800 border-green-200",
  CANCELADO: "bg-zinc-100 text-zinc-500 border-zinc-200",
};

export const PRIORIDADE_COLORS: Record<Prioridade, string> = {
  BAIXA: "bg-green-100 text-green-800 border-green-200",
  MEDIA: "bg-yellow-100 text-yellow-800 border-yellow-200",
  ALTA: "bg-orange-100 text-orange-800 border-orange-200",
  CRITICA: "bg-red-100 text-red-800 border-red-200",
};
