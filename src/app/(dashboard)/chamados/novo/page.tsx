import { getDashboardSession } from "@/lib/contabil-session";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { FormNovoChamado } from "@/components/chamados/FormNovoChamado";
import { PageContextNav } from "@/components/layout/PageContextNav";
import { DashboardMainScroll } from "@/components/layout/DashboardMainScroll";

export default async function NovoChamadoPage() {
  const session = await getDashboardSession();
  if (!session) redirect("/login");
  if (session.user.role === "TV") redirect("/");
  if (session.user.role === "SAC") redirect("/sac/novo");

  const [setores, empresas, projetos] = await Promise.all([
    prisma.setor.findMany({ orderBy: { nome: "asc" } }),
    prisma.empresa.findMany({
      where: { ativo: true },
      orderBy: { nome: "asc" },
      include: {
        vinculos: {
          include: { responsavel: { select: { nome: true } } },
        },
      },
    }),
    prisma.projeto.findMany({
      where: { ativo: true },
      include: { setor: true },
      orderBy: { nome: "asc" },
    }),
  ]);

  return (
    <DashboardMainScroll>
    <div className="w-full">
      <PageContextNav
        items={[
          { label: "Painel inicial", href: "/" },
          { label: "Chamados", href: "/chamados" },
          { label: "Novo chamado" },
        ]}
      />
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-ds-ink">Novo Chamado</h2>
        <p className="text-ds-ash text-sm mt-1">
          Preencha os dados para abrir um novo chamado
        </p>
      </div>
      <FormNovoChamado setores={setores} empresas={empresas} projetos={projetos} />
    </div>
    </DashboardMainScroll>
  );
}
