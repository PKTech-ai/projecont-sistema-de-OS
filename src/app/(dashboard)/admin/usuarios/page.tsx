import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { UsuariosClient } from "./UsuariosClient";

export default async function UsuariosAdminPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "SUPERADMIN") redirect("/");

  const [usuarios, setores] = await Promise.all([
    prisma.usuario.findMany({
      include: { setor: true },
      orderBy: [{ setor: { nome: "asc" } }, { nome: "asc" }],
    }),
    prisma.setor.findMany({ orderBy: { nome: "asc" } }),
  ]);

  return <UsuariosClient usuarios={usuarios} setores={setores} />;
}
