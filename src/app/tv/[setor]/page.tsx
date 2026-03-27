import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { StatusChamado, TipoSetor } from "@prisma/client";
import { ChamadoStatus } from "@/components/chamados/ChamadoStatus";
import { ChamadoPrioridade } from "@/components/chamados/ChamadoPrioridade";
import { SlaIndicator } from "@/components/chamados/SlaIndicator";
import { ProjecontLogo } from "@/components/ui/logo";
import { formatDateTime } from "@/lib/utils";
import { TVRefresher } from "@/components/tv/TVRefresher";
import { TVSignOutButton } from "@/components/tv/TVSignOutButton";

const SETOR_TIPO_MAP: Record<string, TipoSetor> = {
  contabil: TipoSetor.CONTABIL,
  fiscal: TipoSetor.FISCAL,
  dp: TipoSetor.DP,
  ia: TipoSetor.IA,
  clientes: TipoSetor.CLIENTES,
};

export default async function TVPage({
  params,
}: {
  params: Promise<{ setor: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const { setor: setorParam } = await params;
  const tipoSetor = SETOR_TIPO_MAP[setorParam.toLowerCase()];

  if (!tipoSetor) redirect("/login");

  // TV só pode ver o setor vinculado à sua sessão
  if (session.user.role === "TV" && session.user.setorTipo !== tipoSetor) {
    redirect(`/tv/${session.user.setorTipo.toLowerCase()}`);
  }

  const setor = await prisma.setor.findUnique({ where: { tipo: tipoSetor } });
  if (!setor) redirect("/login");

  const chamados = await prisma.chamado.findMany({
    where: {
      status: { notIn: [StatusChamado.CONCLUIDO, StatusChamado.CANCELADO] },
      OR: [
        { solicitante: { setorId: setor.id } },
        { responsavel: { setorId: setor.id } },
      ],
    },
    include: {
      solicitante: { select: { nome: true } },
      responsavel: { select: { nome: true } },
      empresa: { select: { nome: true } },
      projeto: { select: { nome: true } },
    },
    orderBy: [{ prioridade: "desc" }, { criadoEm: "asc" }],
  });

  const now = new Date();

  return (
    <div className="min-h-screen bg-[#001F3E] text-white flex flex-col">
      <TVRefresher intervalMs={30000} />

      {/* Header */}
      <div className="flex items-center justify-between px-8 py-5 border-b border-white/10">
        <ProjecontLogo variant="dark" size="md" showTagline />
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">{setor.nome}</h1>
          <p className="text-white/50 text-sm">Painel de Chamados</p>
        </div>
        <div className="text-right">
          <p className="text-white/50 text-xs">Atualizado em</p>
          <p className="text-white text-sm font-medium">{formatDateTime(now)}</p>
          <p className="text-[#1AB6D9] text-xs mt-0.5">Atualiza a cada 30s</p>
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-8 px-8 py-3 bg-white/5 border-b border-white/10">
        {[
          { label: "Abertos", value: chamados.filter((c) => c.status === "ABERTO").length, color: "text-blue-300" },
          { label: "Em Andamento", value: chamados.filter((c) => c.status === "EM_ANDAMENTO").length, color: "text-yellow-300" },
          { label: "Aguardando Validação", value: chamados.filter((c) => c.status === "AGUARDANDO_VALIDACAO").length, color: "text-purple-300" },
          { label: "Total Ativo", value: chamados.length, color: "text-[#1AB6D9]" },
        ].map((stat) => (
          <div key={stat.label} className="flex items-center gap-2">
            <span className={`text-2xl font-bold ${stat.color}`}>{stat.value}</span>
            <span className="text-white/50 text-sm">{stat.label}</span>
          </div>
        ))}
      </div>

      {/* Cards grid */}
      <div className="flex-1 p-6">
        {chamados.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center">
              <span className="text-3xl">✓</span>
            </div>
            <p className="text-white/60 text-xl">Nenhum chamado ativo no momento</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {chamados.map((c) => (
              <div
                key={c.id}
                className="bg-white/5 border border-[#1AB6D9]/30 rounded-xl p-4 hover:border-[#1AB6D9]/60 transition-colors"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <h3 className="font-semibold text-white text-sm leading-tight line-clamp-2 flex-1">
                    {c.titulo}
                  </h3>
                  <ChamadoPrioridade prioridade={c.prioridade} className="shrink-0 text-xs" />
                </div>

                <div className="flex items-center gap-2 mb-3">
                  <ChamadoStatus status={c.status} className="text-xs" />
                  <SlaIndicator prazoSla={c.prazoSla} status={c.status} />
                </div>

                <div className="space-y-1.5 text-xs text-white/60">
                  <p>
                    <span className="text-white/40">Solicitante:</span>{" "}
                    {c.solicitante.nome}
                  </p>
                  <p>
                    <span className="text-white/40">Responsável:</span>{" "}
                    {c.responsavel?.nome ?? (
                      <span className="text-[#1AB6D9] italic">Aguardando</span>
                    )}
                  </p>
                  {(c.empresa || c.projeto) && (
                    <p>
                      <span className="text-white/40">
                        {c.empresa ? "Empresa" : "Projeto"}:
                      </span>{" "}
                      {c.empresa?.nome ?? c.projeto?.nome}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-8 py-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
        <p className="text-white/30 text-xs">Projecont Consultoria Contábil · Sistema Interno</p>
        <div className="flex items-center gap-4">
          <p className="text-white/30 text-xs">
            {chamados.length} chamado{chamados.length !== 1 ? "s" : ""} ativo{chamados.length !== 1 ? "s" : ""}
          </p>
          <TVSignOutButton />
        </div>
      </div>
    </div>
  );
}
