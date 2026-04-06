import type { ReactNode } from "react";

/** Área rolável padrão do dashboard (lista de páginas com conteúdo longo). */
export function DashboardMainScroll({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch]">
      {children}
    </div>
  );
}
