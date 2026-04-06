"use client";

import {
  minutosUteisEntre,
  formatMinutosUteisLegivel,
} from "@/lib/sla";
import { cn } from "@/lib/utils";
import { Clock, AlertTriangle } from "lucide-react";

interface SlaIndicatorProps {
  prazoSla: Date | null | undefined;
  status: string;
}

const UMA_JORNADA_MIN = 8 * 60;

export function SlaIndicator({ prazoSla, status }: SlaIndicatorProps) {
  if (!prazoSla) return null;
  if (status === "CONCLUIDO" || status === "CANCELADO") return null;

  const now = new Date();
  const prazo = new Date(prazoSla);
  const vencido = prazo < now;
  const minRestantes = minutosUteisEntre(now, prazo);
  const urgente = !vencido && minRestantes <= UMA_JORNADA_MIN;

  if (vencido) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-ds-danger-fg bg-ds-danger-bg border border-ds-danger/25 px-2 py-0.5 rounded-full">
        <AlertTriangle className="h-3 w-3" />
        Fora do prazo
      </span>
    );
  }

  const texto = formatMinutosUteisLegivel(minRestantes);

  if (urgente) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 text-xs font-medium text-ds-warning-fg bg-ds-warning-bg border border-ds-warning/30 px-2 py-0.5 rounded-full"
        )}
      >
        <Clock className="h-3 w-3" />
        {texto} restantes
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-ds-charcoal bg-ds-linen border border-ds-pebble px-2 py-0.5 rounded-full">
      <Clock className="h-3 w-3" />
      {texto} restantes
    </span>
  );
}
