"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/types";

function podeAcessarProjetos(role: string) {
  return role === "SUPERADMIN" || role === "ANALISTA" || role === "GESTOR";
}

const projetoSchema = z.object({
  nome: z.string().min(2),
  descricao: z.string().optional(),
  setorId: z.string(),
});

export async function criarProjeto(
  input: z.infer<typeof projetoSchema>
): Promise<ActionResult<{ id: string }>> {
  const session = await auth();
  if (!session) return { error: "Não autorizado" };
  if (!podeAcessarProjetos(session.user.role)) {
    return { error: "Não autorizado" };
  }

  if (session.user.role !== "SUPERADMIN" && input.setorId !== session.user.setorId) {
    return { error: "Só pode criar projetos no seu setor" };
  }

  const projeto = await prisma.projeto.create({
    data: { nome: input.nome, descricao: input.descricao, setorId: input.setorId },
  });

  revalidatePath("/admin/projetos");
  return { success: true, data: { id: projeto.id } };
}

export async function editarProjeto(
  id: string,
  input: Partial<z.infer<typeof projetoSchema>>
): Promise<ActionResult> {
  const session = await auth();
  if (!session) return { error: "Não autorizado" };
  if (!podeAcessarProjetos(session.user.role)) {
    return { error: "Não autorizado" };
  }

  const projeto = await prisma.projeto.findUnique({ where: { id } });
  if (!projeto) return { error: "Projeto não encontrado" };

  if (session.user.role !== "SUPERADMIN" && projeto.setorId !== session.user.setorId) {
    return { error: "Não autorizado" };
  }
  if (session.user.role !== "SUPERADMIN" && input.setorId && input.setorId !== session.user.setorId) {
    return { error: "Não pode mover projeto para outro setor" };
  }

  await prisma.projeto.update({ where: { id }, data: input });
  revalidatePath("/admin/projetos");
  return { success: true };
}

export async function ativarDesativarProjeto(id: string, ativo: boolean): Promise<ActionResult> {
  const session = await auth();
  if (!session) return { error: "Não autorizado" };
  if (!podeAcessarProjetos(session.user.role)) {
    return { error: "Não autorizado" };
  }

  const projeto = await prisma.projeto.findUnique({ where: { id } });
  if (!projeto) return { error: "Projeto não encontrado" };

  if (session.user.role !== "SUPERADMIN" && projeto.setorId !== session.user.setorId) {
    return { error: "Não autorizado" };
  }

  await prisma.projeto.update({ where: { id }, data: { ativo } });
  revalidatePath("/admin/projetos");
  return { success: true };
}
