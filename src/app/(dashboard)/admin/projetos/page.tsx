import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ProjetosClient } from "./ProjetosClient";

export default async function ProjetosAdminPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const podeAcessar =
    session.user.role === "SUPERADMIN" ||
    (session.user.setorTipo === "IA" &&
      (session.user.role === "ANALISTA" || session.user.role === "GESTOR"));

  if (!podeAcessar) redirect("/");

  const [projetos, setorIA] = await Promise.all([
    prisma.projeto.findMany({
      include: { setor: true },
      orderBy: { criadoEm: "desc" },
    }),
    prisma.setor.findUniqueOrThrow({ where: { tipo: "IA" } }),
  ]);

  return <ProjetosClient projetos={projetos} setorIA={setorIA} />;
}
