import { Suspense } from "react";
import { getDashboardSession } from "@/lib/contabil-session";
import { redirect } from "next/navigation";
import { getKPIs, getMeusChamados } from "@/server/queries/dashboard";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { TabelaChamados } from "@/components/dashboard/TabelaChamados";
import { DashboardFiltros } from "@/components/dashboard/DashboardFiltros";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus, Headphones } from "lucide-react";
import { parseFiltrosChamados } from "@/lib/filtros-chamados";
import { DashboardMainScroll } from "@/components/layout/DashboardMainScroll";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getDashboardSession();
  if (!session) redirect("/login");

  const sp = await searchParams;
  const filtros = parseFiltrosChamados(sp);

  const isSac = session.user.role === "SAC";
  const novoChamadoHref = isSac ? "/sac/novo" : "/chamados/novo";
  const novoChamadoLabel = isSac ? "Chamado para cliente" : "Novo chamado";

  const [kpis, meusChamados] = await Promise.all([
    getKPIs({
      userId: session.user.id,
      role: session.user.role,
      setorId: session.user.setorId,
    }),
    getMeusChamados(session.user.id, session.user.role, session.user.setorId, filtros),
  ]);

  return (
    <DashboardMainScroll>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-ds-ink">Dashboard</h2>
          <p className="text-ds-ash text-sm mt-1">
            Olá, bem-vindo ao sistema de chamados Projecont
          </p>
        </div>
        <Button
          render={<Link href={novoChamadoHref} />}
          nativeButton={false}
          className="bg-ds-ink hover:bg-ds-ink-dark text-ds-paper"
        >
          {isSac ? (
            <Headphones className="h-4 w-4 mr-2" />
          ) : (
            <Plus className="h-4 w-4 mr-2" />
          )}
          {novoChamadoLabel}
        </Button>
      </div>

      <StatsCards {...kpis} />

      <Suspense
        fallback={
          <div className="h-24 rounded-xl border border-ds-pebble bg-ds-paper animate-pulse" />
        }
      >
        <DashboardFiltros />
      </Suspense>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-ds-ink">Meus chamados</h3>
          <Button
            render={<Link href="/chamados" />}
            nativeButton={false}
            variant="outline"
            size="sm"
            className="border-ds-pebble text-ds-ash hover:text-ds-ink"
          >
            Ver todos
          </Button>
        </div>
        <TabelaChamados
          chamados={meusChamados}
          emptyMessage="Nenhum chamado ativo para você no momento."
        />
      </div>
    </div>
    </DashboardMainScroll>
  );
}
