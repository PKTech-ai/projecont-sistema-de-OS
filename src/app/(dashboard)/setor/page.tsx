import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getChamadosSetor } from "@/server/queries/dashboard";
import { getKPIs } from "@/server/queries/dashboard";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { TabelaChamados } from "@/components/dashboard/TabelaChamados";
import { prisma } from "@/lib/prisma";

export default async function SetorPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const [setor, kpis, chamados] = await Promise.all([
    prisma.setor.findUnique({ where: { id: session.user.setorId } }),
    getKPIs({
      userId: session.user.id,
      role: session.user.role,
      setorId: session.user.setorId,
    }),
    getChamadosSetor(session.user.setorId),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#001F3E]">
          Dashboard — {setor?.nome ?? "Meu Setor"}
        </h2>
        <p className="text-[#64789B] text-sm mt-1">
          Visão geral dos chamados do setor
        </p>
      </div>

      <StatsCards {...kpis} />

      <div>
        <h3 className="text-lg font-semibold text-[#001F3E] mb-4">
          Chamados Ativos do Setor
        </h3>
        <TabelaChamados
          chamados={chamados}
          emptyMessage="Nenhum chamado ativo no setor."
        />
      </div>
    </div>
  );
}
