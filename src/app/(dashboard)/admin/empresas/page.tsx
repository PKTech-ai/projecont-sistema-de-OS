import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { EmpresasClient } from "./EmpresasClient";

export default async function EmpresasAdminPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "SUPERADMIN") redirect("/");

  const [empresas, usuarios] = await Promise.all([
    prisma.empresa.findMany({
      include: {
        vinculos: {
          include: {
            responsavel: { select: { id: true, nome: true, setor: { select: { tipo: true, nome: true } } } },
          },
        },
      },
      orderBy: { nome: "asc" },
    }),
    prisma.usuario.findMany({
      where: { ativo: true, role: { not: "TV" } },
      select: { id: true, nome: true, setor: { select: { tipo: true, nome: true } } },
      orderBy: [{ setor: { nome: "asc" } }, { nome: "asc" }],
    }),
  ]);

  return <EmpresasClient empresas={empresas} usuarios={usuarios} />;
}
