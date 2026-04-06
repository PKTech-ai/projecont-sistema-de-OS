"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import bcrypt from "bcryptjs";
import type { ActionResult } from "@/types";
import { Role } from "@prisma/client";
import { ROLES_GESTOR_GERENCIA } from "@/lib/gestor-permissions";

const criarUsuarioSchema = z.object({
  nome: z.string().min(2),
  email: z.string().email(),
  senha: z.string().min(6),
  role: z.nativeEnum(Role),
  setorId: z.string(),
  telefone: z.string().optional().nullable(),
  cargo: z.string().optional().nullable(),
  observacoes: z.string().optional().nullable(),
});

const atualizarCadastroUsuarioSchema = z.object({
  usuarioId: z.string(),
  telefone: z.string().optional().nullable(),
  cargo: z.string().optional().nullable(),
  observacoes: z.string().optional().nullable(),
});

export async function criarUsuario(
  input: z.infer<typeof criarUsuarioSchema>
): Promise<ActionResult<{ id: string }>> {
  const session = await auth();
  if (!session) return { error: "Não autorizado" };

  const parsed = criarUsuarioSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  if (session.user.role === "SUPERADMIN") {
    // sem restrição extra
  } else if (session.user.role === "GESTOR") {
    if (parsed.data.setorId !== session.user.setorId) {
      return { error: "Só é possível cadastrar usuários no seu setor" };
    }
    if (!ROLES_GESTOR_GERENCIA.includes(parsed.data.role)) {
      return { error: "Gestor só pode cadastrar perfil Analista ou SAC no próprio setor" };
    }
  } else {
    return { error: "Não autorizado" };
  }

  const existing = await prisma.usuario.findUnique({ where: { email: parsed.data.email } });
  if (existing) return { error: "Email já cadastrado" };

  const senhaHash = await bcrypt.hash(parsed.data.senha, 10);
  const { telefone, cargo, observacoes, ...rest } = parsed.data;
  const usuario = await prisma.usuario.create({
    data: {
      ...rest,
      senha: senhaHash,
      telefone: telefone?.trim() || null,
      cargo: cargo?.trim() || null,
      observacoes: observacoes?.trim() || null,
    },
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

  const alvo = await prisma.usuario.findUnique({ where: { id: usuarioId } });
  if (!alvo) return { error: "Usuário não encontrado" };

  if (session.user.role === "SUPERADMIN") {
    await prisma.usuario.update({ where: { id: usuarioId }, data: { ativo } });
    revalidatePath("/admin/usuarios");
    return { success: true };
  }

  if (session.user.role === "GESTOR") {
    if (alvo.setorId !== session.user.setorId) {
      return { error: "Só é possível gerenciar usuários do seu setor" };
    }
    if (alvo.role === "SUPERADMIN" || alvo.role === "TV") {
      return { error: "Não autorizado" };
    }
    if (alvo.role === "GESTOR") {
      return { error: "Apenas o administrador pode alterar outros gestores" };
    }
    if (!ativo && alvo.id === session.user.id) {
      return { error: "Você não pode desativar a si mesmo" };
    }
    await prisma.usuario.update({ where: { id: usuarioId }, data: { ativo } });
    revalidatePath("/admin/usuarios");
    return { success: true };
  }

  return { error: "Não autorizado" };
}

export async function alterarRoleUsuario(
  usuarioId: string,
  role: Role,
  setorId: string
): Promise<ActionResult> {
  const session = await auth();
  if (!session) return { error: "Não autorizado" };

  const alvo = await prisma.usuario.findUnique({ where: { id: usuarioId } });
  if (!alvo) return { error: "Usuário não encontrado" };

  if (session.user.role === "SUPERADMIN") {
    await prisma.usuario.update({
      where: { id: usuarioId },
      data: { role, setorId },
    });
    revalidatePath("/admin/usuarios");
    return { success: true };
  }

  if (session.user.role === "GESTOR") {
    if (alvo.setorId !== session.user.setorId || setorId !== session.user.setorId) {
      return { error: "Só é possível gerenciar usuários do seu setor" };
    }
    if (alvo.role === "GESTOR") {
      return { error: "Apenas o administrador pode alterar outros gestores" };
    }
    if (role === "SUPERADMIN" || role === "TV") {
      return { error: "Perfil não permitido" };
    }
    if (!ROLES_GESTOR_GERENCIA.includes(role)) {
      return { error: "Gestor só pode definir perfil Analista ou SAC" };
    }
    await prisma.usuario.update({
      where: { id: usuarioId },
      data: { role, setorId },
    });
    revalidatePath("/admin/usuarios");
    return { success: true };
  }

  return { error: "Não autorizado" };
}

export async function atualizarCadastroUsuario(
  input: z.infer<typeof atualizarCadastroUsuarioSchema>
): Promise<ActionResult> {
  const session = await auth();
  if (!session) return { error: "Não autorizado" };

  const parsed = atualizarCadastroUsuarioSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const alvo = await prisma.usuario.findUnique({ where: { id: parsed.data.usuarioId } });
  if (!alvo) return { error: "Usuário não encontrado" };

  if (session.user.role === "SUPERADMIN") {
    await prisma.usuario.update({
      where: { id: parsed.data.usuarioId },
      data: {
        telefone: parsed.data.telefone?.trim() || null,
        cargo: parsed.data.cargo?.trim() || null,
        observacoes: parsed.data.observacoes?.trim() || null,
      },
    });
    revalidatePath("/admin/usuarios");
    return { success: true };
  }

  if (session.user.role === "GESTOR") {
    if (alvo.setorId !== session.user.setorId) {
      return { error: "Só é possível editar usuários do seu setor" };
    }
    if (alvo.role === "GESTOR" || alvo.role === "SUPERADMIN") {
      return { error: "Não autorizado" };
    }
    await prisma.usuario.update({
      where: { id: parsed.data.usuarioId },
      data: {
        telefone: parsed.data.telefone?.trim() || null,
        cargo: parsed.data.cargo?.trim() || null,
        observacoes: parsed.data.observacoes?.trim() || null,
      },
    });
    revalidatePath("/admin/usuarios");
    return { success: true };
  }

  return { error: "Não autorizado" };
}
