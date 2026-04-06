import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { FormSacAberturaCliente } from "@/components/chamados/FormSacAberturaCliente";
import { PageContextNav } from "@/components/layout/PageContextNav";
import { DashboardMainScroll } from "@/components/layout/DashboardMainScroll";

export default async function SacNovoChamadoPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role === "TV") redirect("/");
  if (session.user.role !== "SAC" && session.user.role !== "SUPERADMIN") {
    redirect("/");
  }

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
          { label: "Chamado para cliente" },
        ]}
      />
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-ds-ink">Atendimento ao cliente (SAC)</h2>
        <p className="text-ds-ash text-sm mt-1">
          Abra aqui os chamados que você registrar <strong className="text-ds-charcoal">em nome do cliente</strong>.
          Demandas internas da equipe continuam em &quot;Novo chamado&quot; no menu geral.
        </p>
      </div>
      <FormSacAberturaCliente setores={setores} empresas={empresas} projetos={projetos} />
    </div>
    </DashboardMainScroll>
  );
}
