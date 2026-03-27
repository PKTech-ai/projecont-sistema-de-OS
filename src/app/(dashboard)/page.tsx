import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getKPIs, getMeusChamados } from "@/server/queries/dashboard";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { TabelaChamados } from "@/components/dashboard/TabelaChamados";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus } from "lucide-react";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const [kpis, meusChamados] = await Promise.all([
    getKPIs({
      userId: session.user.id,
      role: session.user.role,
      setorId: session.user.setorId,
    }),
    getMeusChamados(session.user.id, session.user.role),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#001F3E]">Dashboard</h2>
          <p className="text-[#64789B] text-sm mt-1">
            Olá, bem-vindo ao sistema de chamados Projecont
          </p>
        </div>
        <Button
          render={<Link href="/chamados/novo" />}
          nativeButton={false}
          className="bg-[#1AB6D9] hover:bg-[#2082BE] text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Novo Chamado
        </Button>
      </div>

      <StatsCards {...kpis} />

      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-[#001F3E]">Meus Chamados Ativos</h3>
          <Button
            render={<Link href="/chamados" />}
            nativeButton={false}
            variant="outline"
            size="sm"
            className="border-[#DCE2EB] text-[#64789B] hover:text-[#001F3E]"
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
  );
}
