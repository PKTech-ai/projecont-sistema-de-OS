"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import bcrypt from "bcryptjs";
import type { ActionResult } from "@/types";
import { Role } from "@prisma/client";

const criarUsuarioSchema = z.object({
  nome: z.string().min(2),
  email: z.string().email(),
  senha: z.string().min(6),
  role: z.nativeEnum(Role),
  setorId: z.string(),
});

export async function criarUsuario(
  input: z.infer<typeof criarUsuarioSchema>
): Promise<ActionResult<{ id: string }>> {
  const session = await auth();
  if (!session) return { error: "Não autorizado" };
  if (session.user.role !== "SUPERADMIN") return { error: "Apenas SUPERADMIN pode criar usuários" };

  const existing = await prisma.usuario.findUnique({ where: { email: input.email } });
  if (existing) return { error: "Email já cadastrado" };

  const senhaHash = await bcrypt.hash(input.senha, 10);
  const usuario = await prisma.usuario.create({
    data: { ...input, senha: senhaHash },
  });

  revalidatePath("/admin/usuarios");
  return { success: true, data: { id: usuario.id } };
}

export async function alterarStatusUsuario(
  usuarioId: string,
  ativo: boolean
): Promise<ActionResult> {
  const session = await auth();
  if (!session) return { error: "Não autorizado" };
  if (session.user.role !== "SUPERADMIN") return { error: "Apenas SUPERADMIN" };

  await prisma.usuario.update({ where: { id: usuarioId }, data: { ativo } });
  revalidatePath("/admin/usuarios");
  return { success: true };
}

export async function alterarRoleUsuario(
  usuarioId: string,
  role: Role,
  setorId: string
): Promise<ActionResult> {
  const session = await auth();
  if (!session) return { error: "Não autorizado" };
  if (session.user.role !== "SUPERADMIN") return { error: "Apenas SUPERADMIN" };

  await prisma.usuario.update({
    where: { id: usuarioId },
    data: { role, setorId },
  });

  revalidatePath("/admin/usuarios");
  return { success: true };
}
