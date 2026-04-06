"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { ChamadoStatus } from "@/components/chamados/ChamadoStatus";
import { cn } from "@/lib/utils";
import type { StatusChamado } from "@prisma/client";

interface ChamadoDetalheHeaderProps {
  /** Quando não é mais NAO_INICIADO — cabeçalho compacto com painel expansível */
  chamadoIniciado: boolean;
  idCurto: string;
  titulo: string;
  aberturaFormatada: string;
  solicitanteNome: string;
  descricao: string;
  status: StatusChamado;
}

export function ChamadoDetalheHeader({
  chamadoIniciado,
  idCurto,
  titulo,
  aberturaFormatada,
  solicitanteNome,
  descricao,
  status,
}: ChamadoDetalheHeaderProps) {
  const [detalhesAbertos, setDetalhesAbertos] = useState(false);

  if (!chamadoIniciado) {
    return (
      <div className="w-full min-w-0 shrink-0 pt-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-mono text-ds-ash mb-0.5">Chamado #{idCurto}</p>
            <h1 className="text-lg md:text-xl font-bold text-ds-ink leading-tight break-words">
              {titulo}
            </h1>
            <p className="text-xs sm:text-sm text-ds-ash mt-1.5 break-words">
              <span className="text-ds-charcoal font-medium">Abertura</span> · {aberturaFormatada} ·
              Solicitante:{" "}
              <strong className="text-ds-charcoal">{solicitanteNome}</strong>
            </p>
          </div>
          <div className="shrink-0 flex justify-end">
            <ChamadoStatus status={status} />
          </div>
        </div>
        <div className="mt-2 rounded-lg border border-ds-pebble bg-white p-3 max-h-[min(30vh,240px)] overflow-y-auto overflow-x-hidden">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ds-ash mb-1.5">
            Descrição da solicitação
          </p>
          <p className="text-sm text-ds-charcoal leading-relaxed whitespace-pre-wrap break-words">
            {descricao}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 shrink-0 pt-1">
      {/* Barra do dropdown sempre visível; painel abaixo rola por dentro */}
      <button
        type="button"
        onClick={() => setDetalhesAbertos((v) => !v)}
        className="flex w-full min-w-0 flex-wrap items-center gap-2 rounded-lg py-2 text-left transition-colors hover:bg-ds-linen/70 sm:gap-3"
        aria-expanded={detalhesAbertos}
      >
        <span className="text-[11px] font-mono text-ds-ash shrink-0">#{idCurto}</span>
        <h1 className="min-w-0 flex-1 truncate text-base font-bold text-ds-ink md:text-lg">
          {titulo}
        </h1>
        <div className="shrink-0">
          <ChamadoStatus status={status} />
        </div>
        <ChevronDown
          className={cn(
            "h-5 w-5 shrink-0 text-ds-ash transition-transform duration-200",
            detalhesAbertos && "rotate-180"
          )}
          aria-hidden
        />
      </button>
      {detalhesAbertos && (
        <div className="mt-2 max-h-[min(42vh,320px)] overflow-y-auto overflow-x-hidden rounded-lg border border-ds-pebble bg-white p-3 shadow-sm">
          <p className="mb-3 break-words text-sm text-ds-ash">
            <span className="font-medium text-ds-charcoal">Abertura</span> · {aberturaFormatada} ·
            Solicitante: <strong className="text-ds-charcoal">{solicitanteNome}</strong>
          </p>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ds-ash">
            Descrição da solicitação
          </p>
          <p className="break-words text-sm leading-relaxed text-ds-charcoal whitespace-pre-wrap">
            {descricao}
          </p>
        </div>
      )}
    </div>
  );
}
