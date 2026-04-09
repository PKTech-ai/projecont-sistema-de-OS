import { Suspense } from "react";
import { getDashboardSession } from "@/lib/contabil-session";
import { redirect } from "next/navigation";
import { getChamadosSetor } from "@/server/queries/dashboard";
import { getKPIs } from "@/server/queries/dashboard";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { TabelaChamados } from "@/components/dashboard/TabelaChamados";
import { DashboardFiltros } from "@/components/dashboard/DashboardFiltros";
import { prisma } from "@/lib/prisma";
import { PageContextNav } from "@/components/layout/PageContextNav";
import { DashboardMainScroll } from "@/components/layout/DashboardMainScroll";
import { parseFiltrosChamados } from "@/lib/filtros-chamados";

export default async function SetorPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getDashboardSession();
  if (!session) redirect("/login");

  const sp = await searchParams;
  const filtros = parseFiltrosChamados(sp);

  const [setor, kpis, chamados] = await Promise.all([
    prisma.setor.findUnique({ where: { id: session.user.setorId } }),
    getKPIs({
      userId: session.user.id,
      role: session.user.role,
      setorId: session.user.setorId,
    }),
    getChamadosSetor(session.user.setorId, filtros),
  ]);

  return (
    <DashboardMainScroll>
    <div className="space-y-6">
      <PageContextNav
        items={[
          { label: "Painel inicial", href: "/" },
          { label: `Setor — ${setor?.nome ?? "Meu setor"}` },
        ]}
      />
      <div>
        <h2 className="text-2xl font-bold text-ds-ink">
          Dashboard — {setor?.nome ?? "Meu Setor"}
        </h2>
        <p className="text-ds-ash text-sm mt-1">
          Visão geral dos chamados do setor
        </p>
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
        <h3 className="text-lg font-semibold text-ds-ink mb-4">
          Chamados do setor
        </h3>
        <TabelaChamados
          chamados={chamados}
          emptyMessage="Nenhum chamado ativo no setor."
        />
      </div>
    </div>
    </DashboardMainScroll>
  );
}
