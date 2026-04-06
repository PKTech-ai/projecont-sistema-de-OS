import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { EmpresasClient } from "./EmpresasClient";
import { PageContextNav } from "@/components/layout/PageContextNav";
import { DashboardMainScroll } from "@/components/layout/DashboardMainScroll";

export default async function EmpresasAdminPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const isGestor = session.user.role === "GESTOR";
  const isSuper = session.user.role === "SUPERADMIN";

  if (!isGestor && !isSuper) redirect("/");

  const [empresas, usuarios] = await Promise.all([
    prisma.empresa.findMany({
      include: {
        vinculos: {
          // Gestor: só carrega vínculos do próprio tipo de serviço (isolamento por setor).
          where: isGestor ? { tipoServico: session.user.setorTipo } : undefined,
          include: {
            responsavel: { select: { id: true, nome: true, setor: { select: { tipo: true, nome: true } } } },
          },
        },
      },
      orderBy: { nome: "asc" },
    }),
    prisma.usuario.findMany({
      where: {
        ativo: true,
        role: { not: "TV" },
        ...(isGestor ? { setorId: session.user.setorId } : {}),
      },
      select: { id: true, nome: true, setor: { select: { tipo: true, nome: true } } },
      orderBy: [{ setor: { nome: "asc" } }, { nome: "asc" }],
    }),
  ]);

  return (
    <DashboardMainScroll>
    <>
      <PageContextNav
        items={[
          { label: "Painel inicial", href: "/" },
          { label: "Empresas e vínculos" },
        ]}
      />
      <EmpresasClient
        empresas={empresas}
        usuarios={usuarios}
        modo={isSuper ? "superadmin" : "gestor"}
        setorTipoGestor={isGestor ? session.user.setorTipo : undefined}
      />
    </>
    </DashboardMainScroll>
  );
}
