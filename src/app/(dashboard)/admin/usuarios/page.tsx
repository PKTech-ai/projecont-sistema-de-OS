import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { UsuariosClient } from "./UsuariosClient";
import { PageContextNav } from "@/components/layout/PageContextNav";
import { DashboardMainScroll } from "@/components/layout/DashboardMainScroll";

export default async function UsuariosAdminPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const isGestor = session.user.role === "GESTOR";
  const isSuper = session.user.role === "SUPERADMIN";

  if (!isGestor && !isSuper) redirect("/");

  const [usuarios, setores] = await Promise.all([
    prisma.usuario.findMany({
      where: isGestor ? { setorId: session.user.setorId } : undefined,
      include: { setor: true },
      orderBy: [{ setor: { nome: "asc" } }, { nome: "asc" }],
    }),
    prisma.setor.findMany({ orderBy: { nome: "asc" } }),
  ]);

  const setorGestor = isGestor
    ? setores.find((s) => s.id === session.user.setorId) ?? null
    : null;

  return (
    <DashboardMainScroll>
    <>
      <PageContextNav
        items={[
          { label: "Painel inicial", href: "/" },
          { label: isGestor ? "Equipe do setor" : "Usuários" },
        ]}
      />
      <UsuariosClient
        usuarios={usuarios}
        setores={setores}
        modo={isSuper ? "superadmin" : "gestor"}
        setorGestorId={session.user.setorId}
        setorGestorNome={setorGestor?.nome ?? ""}
        currentUserId={session.user.id}
      />
    </>
    </DashboardMainScroll>
  );
}
