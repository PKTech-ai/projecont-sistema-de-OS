import { getDashboardSession } from "@/lib/contabil-session";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { OnboardingTour } from "@/components/ui/OnboardingTour";
import { prisma } from "@/lib/prisma";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getDashboardSession();
  if (!session) redirect("/login");
  if (session.user.role === "TV") {
    redirect(`/tv/${session.user.setorTipo?.toLowerCase()}`);
  }

  const notificacoesRaw = await prisma.notificacao.findMany({
    where: { usuarioId: session.user.id },
    include: { chamado: { select: { id: true, titulo: true, status: true } } },
    orderBy: { criadoEm: "desc" },
    take: 10,
  });

  const notificacoes = notificacoesRaw.map(n => ({
    ...n,
    mensagem: n.tipo === "CHAMADO_ABERTO" ? "Novo chamado para seu setor" :
      n.tipo === "CHAMADO_ASSUMIDO" ? "Chamado assumido" :
        n.tipo === "ENTREGUE" ? "Chamado entregue para validação" :
          n.tipo === "CONCLUIDO" ? "Chamado concluído" :
            n.tipo === "REPROVADO" ? "Chamado reprovado" :
              n.tipo === "TRANSFERIDO" ? "Chamado transferido para você" :
                n.tipo === "CANCELADO" ? "Chamado cancelado" : "Nova notificação",
  }));

  const unreadCount = notificacoes.filter((n) => !n.lida).length;

  const setor = await prisma.setor.findUnique({
    where: { id: session.user.setorId },
  });

  return (
    <div className="flex h-[100dvh] bg-ds-paper overflow-hidden">
      <Sidebar role={session.user.role} setorTipo={session.user.setorTipo} />
      <div className="flex-1 flex flex-col min-w-0 h-[100dvh]">
        <Header
          title="Sistema de Chamados"
          userName={session.user.name ?? "Usuário"}
          role={session.user.role}
          setorNome={setor?.nome}
          unreadCount={unreadCount}
          notificacoes={notificacoes}
        />
        <main className="ds-bg-dot-grid flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-hidden p-6">
          {children}
        </main>
      </div>
      <OnboardingTour role={session.user.role} />
    </div>
  );
}
