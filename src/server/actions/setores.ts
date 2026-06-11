"use server";

import { getDashboardSession } from "@/lib/contabil-session";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/types";

const editarSetorSchema = z.object({
  id: z.string(),
  nome: z.string().min(2, "O nome deve ter pelo menos 2 caracteres"),
});

export async function editarSetor(
  id: string,
  nome: string
): Promise<ActionResult> {
  const session = await getDashboardSession();
  if (!session || session.user.role !== "SUPERADMIN") {
    return { error: "Não autorizado. Apenas administradores do sistema podem editar setores." };
  }

  const parsed = editarSetorSchema.safeParse({ id, nome });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  try {
    await prisma.setor.update({
      where: { id: parsed.data.id },
      data: { nome: parsed.data.nome.trim() },
    });

    revalidatePath("/admin/setores");
    revalidatePath("/admin/usuarios");
    return { success: true };
  } catch (e: any) {
    return { error: "Erro ao atualizar o setor no banco de dados." };
  }
}
