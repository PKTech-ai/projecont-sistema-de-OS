"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/types";

const empresaSchema = z.object({
  nome: z.string().min(2, "Nome deve ter ao menos 2 caracteres"),
});

const vinculoSchema = z.object({
  empresaId: z.string(),
  tipoServico: z.string(),
  responsavelId: z.string(),
});

export async function criarEmpresa(
  input: z.infer<typeof empresaSchema>
): Promise<ActionResult<{ id: string }>> {
  const session = await auth();
  if (!session) return { error: "Não autorizado" };
  if (session.user.role !== "SUPERADMIN") return { error: "Apenas SUPERADMIN pode criar empresas" };

  const parsed = empresaSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const existing = await prisma.empresa.findFirst({ where: { nome: input.nome } });
  if (existing) return { error: "Já existe uma empresa com este nome" };

  const empresa = await prisma.empresa.create({ data: { nome: parsed.data.nome } });
  revalidatePath("/admin/empresas");
  return { success: true, data: { id: empresa.id } };
}

export async function ativarDesativarEmpresa(
  id: string,
  ativo: boolean
): Promise<ActionResult> {
  const session = await auth();
  if (!session) return { error: "Não autorizado" };
  if (session.user.role !== "SUPERADMIN") return { error: "Apenas SUPERADMIN" };

  await prisma.empresa.update({ where: { id }, data: { ativo } });
  revalidatePath("/admin/empresas");
  return { success: true };
}

export async function upsertVinculo(
  input: z.infer<typeof vinculoSchema>
): Promise<ActionResult> {
  const session = await auth();
  if (!session) return { error: "Não autorizado" };
  if (session.user.role !== "SUPERADMIN") return { error: "Apenas SUPERADMIN pode gerenciar vínculos" };

  const parsed = vinculoSchema.safeParse(input);
  if (!parsed.success) return { error: "Dados inválidos" };

  await prisma.vinculoEmpresa.upsert({
    where: {
      empresaId_tipoServico: {
        empresaId: parsed.data.empresaId,
        tipoServico: parsed.data.tipoServico,
      },
    },
    update: { responsavelId: parsed.data.responsavelId },
    create: parsed.data,
  });

  revalidatePath("/admin/empresas");
  return { success: true };
}

export async function removerVinculo(
  empresaId: string,
  tipoServico: string
): Promise<ActionResult> {
  const session = await auth();
  if (!session) return { error: "Não autorizado" };
  if (session.user.role !== "SUPERADMIN") return { error: "Apenas SUPERADMIN" };

  await prisma.vinculoEmpresa.deleteMany({
    where: { empresaId, tipoServico },
  });

  revalidatePath("/admin/empresas");
  return { success: true };
}
