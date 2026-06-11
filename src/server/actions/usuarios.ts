"use server";

import { getDashboardSession } from "@/lib/contabil-session";
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
  nome: z.string().min(2).optional(),
  email: z.string().email().optional(),
  role: z.nativeEnum(Role).optional(),
  setorId: z.string().optional(),
  telefone: z.string().optional().nullable(),
  cargo: z.string().optional().nullable(),
  observacoes: z.string().optional().nullable(),
});

export async function criarUsuario(
  input: z.infer<typeof criarUsuarioSchema>
): Promise<ActionResult<{ id: string }>> {
  const session = await getDashboardSession();
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
  const session = await getDashboardSession();
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
  const session = await getDashboardSession();
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
  const session = await getDashboardSession();
  if (!session) return { error: "Não autorizado" };

  const parsed = atualizarCadastroUsuarioSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const { usuarioId, nome, email, role, setorId, telefone, cargo, observacoes } = parsed.data;

  const alvo = await prisma.usuario.findUnique({ where: { id: usuarioId } });
  if (!alvo) return { error: "Usuário não encontrado" };

  // Validações de Permissões
  if (session.user.role !== "SUPERADMIN") {
    if (session.user.role === "GESTOR") {
      if (alvo.setorId !== session.user.setorId) {
        return { error: "Só é possível editar usuários do seu setor" };
      }
      if (alvo.role === "GESTOR" || alvo.role === "SUPERADMIN") {
        return { error: "Não autorizado a alterar gestores ou administradores" };
      }
      if (setorId && setorId !== session.user.setorId) {
        return { error: "Gestor não pode mudar o setor de um funcionário" };
      }
      if (role && (role === "SUPERADMIN" || role === "TV")) {
        return { error: "Gestor não pode atribuir essas permissões" };
      }
    } else {
      return { error: "Não autorizado" };
    }
  }

  // Validar unicidade do email se alterado
  if (email && email.toLowerCase().trim() !== alvo.email.toLowerCase().trim()) {
    const existing = await prisma.usuario.findFirst({
      where: { email: { equals: email.toLowerCase().trim(), mode: "insensitive" } }
    });
    if (existing) return { error: "E-mail já está cadastrado para outro usuário" };
  }

  await prisma.usuario.update({
    where: { id: usuarioId },
    data: {
      ...(nome && { nome: nome.trim() }),
      ...(email && { email: email.toLowerCase().trim() }),
      ...(role && { role }),
      ...(setorId && { setorId }),
      telefone: telefone !== undefined ? (telefone?.trim() || null) : undefined,
      cargo: cargo !== undefined ? (cargo?.trim() || null) : undefined,
      observacoes: observacoes !== undefined ? (observacoes?.trim() || null) : undefined,
    },
  });

  revalidatePath("/admin/usuarios");
  return { success: true };
}

export async function excluirUsuario(usuarioId: string): Promise<ActionResult> {
  const session = await getDashboardSession();
  if (!session) return { error: "Não autorizado" };

  const alvo = await prisma.usuario.findUnique({ where: { id: usuarioId } });
  if (!alvo) return { error: "Usuário não encontrado" };

  if (
    session.user.role === "SUPERADMIN" ||
    (session.user.role === "GESTOR" && alvo.setorId === session.user.setorId)
  ) {
    if (
      session.user.role === "GESTOR" &&
      (alvo.role === "SUPERADMIN" || alvo.role === "GESTOR" || alvo.role === "TV")
    ) {
      return { error: "Não autorizado a excluir este perfil" };
    }
    
    if (alvo.id === session.user.id) {
      return { error: "Você não pode excluir a si mesmo" };
    }

    try {
      await prisma.usuario.delete({ where: { id: usuarioId } });
      revalidatePath("/admin/usuarios");
      return { success: true };
    } catch (e: any) {
      if (e.code === "P2003") {
        return {
          error:
            "Não é possível excluir pois o usuário possui histórico (chamados, comentários ou vínculos de empresas). Para manter a integridade, use a opção de 'Desativar' ao invés de excluir.",
        };
      }
      return { error: "Erro ao tentar excluir" };
    }
  }

  return { error: "Não autorizado" };
}
