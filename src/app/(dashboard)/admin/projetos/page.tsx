import { getDashboardSession } from "@/lib/contabil-session";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ProjetosClient } from "./ProjetosClient";
import { PageContextNav } from "@/components/layout/PageContextNav";
import { DashboardMainScroll } from "@/components/layout/DashboardMainScroll";

export default async function ProjetosAdminPage() {
  const session = await getDashboardSession();
  if (!session) redirect("/login");

  const podeAcessar =
    session.user.role === "SUPERADMIN" ||
    session.user.role === "ANALISTA" ||
    session.user.role === "GESTOR";

  if (!podeAcessar) redirect("/");

  const [setorUsuario, setorIA] = await Promise.all([
    prisma.setor.findUniqueOrThrow({ where: { id: session.user.setorId } }),
    prisma.setor.findUnique({ where: { tipo: "IA" } }),
  ]);

  const projetos =
    session.user.role === "SUPERADMIN"
      ? await prisma.projeto.findMany({
          include: { setor: true },
          orderBy: { criadoEm: "desc" },
        })
      : await prisma.projeto.findMany({
          where: { setorId: session.user.setorId },
          include: { setor: true },
          orderBy: { criadoEm: "desc" },
        });

  const setorNovoProjeto =
    session.user.role === "SUPERADMIN" ? (setorIA ?? setorUsuario) : setorUsuario;

  return (
    <DashboardMainScroll>
    <>
      <PageContextNav
        items={[
          { label: "Painel inicial", href: "/" },
          { label: "Projetos do setor" },
        ]}
      />
      <ProjetosClient
        projetos={projetos}
        setorContexto={setorUsuario}
        setorNovoProjeto={setorNovoProjeto}
        modo={session.user.role === "SUPERADMIN" ? "superadmin" : "setor"}
      />
    </>
    </DashboardMainScroll>
  );
}
