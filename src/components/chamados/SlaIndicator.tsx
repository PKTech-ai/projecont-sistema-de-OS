"use client";

import { diasUteisEntre } from "@/lib/sla";
import { cn } from "@/lib/utils";
import { Clock, AlertTriangle, CheckCircle } from "lucide-react";

interface SlaIndicatorProps {
  prazoSla: Date | null | undefined;
  status: string;
}

export function SlaIndicator({ prazoSla, status }: SlaIndicatorProps) {
  if (!prazoSla) return null;
  if (status === "CONCLUIDO" || status === "CANCELADO") return null;

  const now = new Date();
  const prazo = new Date(prazoSla);
  const diasRestantes = diasUteisEntre(now, prazo);
  const vencido = prazo < now;
  const urgente = !vencido && diasRestantes <= 1;

  if (vencido) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
        <AlertTriangle className="h-3 w-3" />
        SLA Vencido
      </span>
    );
  }

  if (urgente) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-orange-700 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full">
        <Clock className="h-3 w-3" />
        {diasRestantes}d útil
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-[#64789B] bg-[#DCE2EB] px-2 py-0.5 rounded-full">
      <Clock className="h-3 w-3" />
      {diasRestantes}d úteis
    </span>
  );
}
