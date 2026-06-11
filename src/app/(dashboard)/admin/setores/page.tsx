import { getDashboardSession } from "@/lib/contabil-session";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SetoresClient } from "./SetoresClient";
import { PageContextNav } from "@/components/layout/PageContextNav";
import { DashboardMainScroll } from "@/components/layout/DashboardMainScroll";

export default async function SetoresAdminPage() {
  const session = await getDashboardSession();
  if (!session) redirect("/login");

  if (session.user.role !== "SUPERADMIN") redirect("/");

  const setoresRaw = await prisma.setor.findMany({
    include: {
      _count: {
        select: { usuarios: { where: { ativo: true } } }
      }
    },
    orderBy: { nome: "asc" }
  });

  const setores = setoresRaw.map(s => ({
    id: s.id,
    nome: s.nome,
    tipo: s.tipo,
    usuariosAtivos: s._count.usuarios,
  }));

  return (
    <DashboardMainScroll>
      <>
        <PageContextNav
          items={[
            { label: "Painel inicial", href: "/" },
            { label: "Administração", href: "/admin" },
            { label: "Setores" },
          ]}
        />
        <SetoresClient setores={setores} />
      </>
    </DashboardMainScroll>
  );
}
