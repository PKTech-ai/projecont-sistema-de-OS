"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Label } from "@/components/ui/label";
import { Filter } from "lucide-react";

const STATUS_OPTS = [
  { value: "TODOS", label: "Todos os status" },
  { value: "NAO_INICIADO", label: "Não iniciado" },
  { value: "EM_ANDAMENTO", label: "Em andamento" },
  { value: "AGUARDANDO_VALIDACAO", label: "Aguardando validação" },
  { value: "CONCLUIDO", label: "Concluído" },
  { value: "CANCELADO", label: "Cancelado" },
] as const;

const PRIOR_OPTS = [
  { value: "TODOS", label: "Todas as prioridades" },
  { value: "BAIXA", label: "Baixa" },
  { value: "MEDIA", label: "Média" },
  { value: "ALTA", label: "Alta" },
  { value: "CRITICA", label: "Crítica" },
] as const;

const PRAZO_OPTS = [
  { value: "TODOS", label: "Prazo (qualquer)" },
  { value: "DENTRO", label: "Dentro do prazo (SLA futuro)" },
  { value: "ATRASADO", label: "Em atraso (abertos)" },
] as const;

export function DashboardFiltros() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  function setParam(key: string, value: string) {
    const n = new URLSearchParams(sp.toString());
    if (value === "TODOS" || !value) n.delete(key);
    else n.set(key, value);
    const q = n.toString();
    router.push(q ? `${pathname}?${q}` : pathname);
  }

  return (
    <div className="rounded-xl border border-ds-pebble bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-ds-ink">
        <Filter className="h-4 w-4 text-ds-ash" />
        Filtros da lista
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-ds-ash">Status</Label>
          <select
            className="h-10 w-full rounded-[5px] border border-ds-stone bg-white px-3 text-sm text-ds-charcoal focus:outline-none focus:border-ds-ink focus:ring-2 focus:ring-ds-ink/10"
            value={sp.get("status") ?? "TODOS"}
            onChange={(e) => setParam("status", e.target.value)}
          >
            {STATUS_OPTS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-ds-ash">Prioridade</Label>
          <select
            className="h-10 w-full rounded-[5px] border border-ds-stone bg-white px-3 text-sm text-ds-charcoal focus:outline-none focus:border-ds-ink focus:ring-2 focus:ring-ds-ink/10"
            value={sp.get("prioridade") ?? "TODOS"}
            onChange={(e) => setParam("prioridade", e.target.value)}
          >
            {PRIOR_OPTS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-ds-ash">Prazo</Label>
          <select
            className="h-10 w-full rounded-[5px] border border-ds-stone bg-white px-3 text-sm text-ds-charcoal focus:outline-none focus:border-ds-ink focus:ring-2 focus:ring-ds-ink/10"
            value={sp.get("prazo") ?? "TODOS"}
            onChange={(e) => setParam("prazo", e.target.value)}
          >
            {PRAZO_OPTS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
