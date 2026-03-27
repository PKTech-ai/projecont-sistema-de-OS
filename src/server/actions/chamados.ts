"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { adicionarDiasUteis } from "@/lib/sla";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { StatusChamado, Prioridade, TipoSetor, TipoChamado, Urgencia, Impacto } from "@prisma/client";
import type { ActionResult } from "@/types";

const SLA_DIAS_POR_PRIORIDADE: Record<Prioridade, number> = {
  CRITICA: 1,
  ALTA: 3,
  MEDIA: 5,
  BAIXA: 10,
};

// Transições válidas na máquina de estados
const TRANSICOES_VALIDAS: Partial<Record<StatusChamado, StatusChamado[]>> = {
  ABERTO: [StatusChamado.EM_ANDAMENTO, StatusChamado.CANCELADO],
  EM_ANDAMENTO: [StatusChamado.AGUARDANDO_VALIDACAO, StatusChamado.CANCELADO],
  AGUARDANDO_VALIDACAO: [
    StatusChamado.CONCLUIDO,
    StatusChamado.EM_ANDAMENTO,
    StatusChamado.CANCELADO,
  ],
};

const criarChamadoSchema = z.object({
  titulo: z.string().min(5, "Título deve ter no mínimo 5 caracteres"),
  descricao: z.string().min(10, "Descrição deve ter no mínimo 10 caracteres"),
  prioridade: z.nativeEnum(Prioridade),
  tipo: z.nativeEnum(TipoChamado).default(TipoChamado.SOLICITACAO),
  urgencia: z.nativeEnum(Urgencia).default(Urgencia.MEDIA),
  impacto: z.nativeEnum(Impacto).default(Impacto.MEDIO),
  setorDestinoId: z.string(),
  empresaId: z.string().optional().nullable(),
  projetoId: z.string().optional().nullable(),
  emNomeDeCliente: z.boolean().default(false),
  empresaClienteId: z.string().optional().nullable(),
});

export async function criarChamado(
  input: z.infer<typeof criarChamadoSchema>
): Promise<ActionResult<{ id: string }>> {
  const session = await auth();
  if (!session) return { error: "Não autorizado" };
  if (session.user.role === "TV") return { error: "Não autorizado" };

  if (input.emNomeDeCliente) {
    if (session.user.role !== "GESTOR" && session.user.role !== "SUPERADMIN") {
      return { error: "Apenas GESTOR ou SUPERADMIN podem abrir chamados em nome de cliente" };
    }
  }

  const parsed = criarChamadoSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const setorDestino = await prisma.setor.findUnique({
    where: { id: parsed.data.setorDestinoId },
  });
  if (!setorDestino) return { error: "Setor de destino não encontrado" };

  let responsavelId: string | null = null;

  // Roteamento automático: se empresa + setor tiverem vínculo, atribui responsável
  if (parsed.data.empresaId) {
    const vinculo = await prisma.vinculoEmpresa.findUnique({
      where: {
        empresaId_tipoServico: {
          empresaId: parsed.data.empresaId,
          // tipoServico é armazenado em uppercase (igual ao enum TipoSetor)
          tipoServico: setorDestino.tipo,
        },
      },
    });
    if (vinculo) {
      responsavelId = vinculo.responsavelId;
    }
    // Se não houver vínculo, o chamado fica sem responsável (ABERTO, a ser triado pelo gestor)
  }
  // Setor IA — responsável fica NULL até ser assumido via assumirChamadoIA
  // Funcionários sem vínculo podem abrir chamados sem empresa

  const prazoSla = adicionarDiasUteis(new Date(), SLA_DIAS_POR_PRIORIDADE[parsed.data.prioridade]);

  const chamado = await prisma.chamado.create({
    data: {
      titulo: parsed.data.titulo,
      descricao: parsed.data.descricao,
      prioridade: parsed.data.prioridade,
      tipo: parsed.data.tipo,
      urgencia: parsed.data.urgencia,
      impacto: parsed.data.impacto,
      setorDestinoId: setorDestino.id,
      emNomeDeCliente: parsed.data.emNomeDeCliente,
      prazoSla,
      solicitanteId: session.user.id,
      responsavelId,
      empresaId: parsed.data.empresaId || null,
      projetoId: parsed.data.projetoId || null,
      historicoStatus: {
        create: {
          statusAntes: StatusChamado.ABERTO,
          statusDepois: StatusChamado.ABERTO,
          atorId: session.user.id,
          justificativa: "Chamado aberto",
        },
      },
    },
  });

  // Notificação para o responsável (se houver)
  if (responsavelId) {
    await prisma.notificacao.create({
      data: {
        tipo: "CHAMADO_ABERTO",
        usuarioId: responsavelId,
        chamadoId: chamado.id,
      },
    });
  }

  // LogPersona se abriu em nome de cliente
  if (parsed.data.emNomeDeCliente && parsed.data.empresaClienteId) {
    await prisma.logPersona.create({
      data: {
        atorId: session.user.id,
        empresaId: parsed.data.empresaClienteId,
        chamadoId: chamado.id,
      },
    });
  }

  revalidatePath("/chamados");
  return { success: true, data: { id: chamado.id } };
}

// ─── Entregar chamado (AGUARDANDO_VALIDACAO) com solução obrigatória ─────────
const entregarChamadoSchema = z.object({
  chamadoId: z.string(),
  solucao: z.string().min(10, "Descreva a solução com pelo menos 10 caracteres"),
});

export async function entregarChamado(
  input: z.infer<typeof entregarChamadoSchema>
): Promise<ActionResult> {
  const session = await auth();
  if (!session) return { error: "Não autorizado" };

  const parsed = entregarChamadoSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const chamado = await prisma.chamado.findUnique({ where: { id: parsed.data.chamadoId } });
  if (!chamado) return { error: "Chamado não encontrado" };
  if (chamado.status !== StatusChamado.EM_ANDAMENTO) {
    return { error: "Apenas chamados EM_ANDAMENTO podem ser entregues para validação" };
  }
  if (chamado.responsavelId !== session.user.id && session.user.role !== "SUPERADMIN") {
    return { error: "Apenas o responsável pode entregar o chamado" };
  }

  await prisma.chamado.update({
    where: { id: parsed.data.chamadoId },
    data: {
      status: StatusChamado.AGUARDANDO_VALIDACAO,
      solucao: parsed.data.solucao,
      entregueEm: new Date(),
    },
  });

  await prisma.historicoStatus.create({
    data: {
      statusAntes: StatusChamado.EM_ANDAMENTO,
      statusDepois: StatusChamado.AGUARDANDO_VALIDACAO,
      chamadoId: parsed.data.chamadoId,
      atorId: session.user.id,
      justificativa: `Entregue para validação`,
    },
  });

  await prisma.notificacao.create({
    data: {
      tipo: "ENTREGUE",
      usuarioId: chamado.solicitanteId,
      chamadoId: parsed.data.chamadoId,
    },
  });

  revalidatePath(`/chamados/${parsed.data.chamadoId}`);
  revalidatePath("/chamados");
  return { success: true };
}

const mudarStatusSchema = z.object({
  chamadoId: z.string(),
  novoStatus: z.nativeEnum(StatusChamado),
  justificativa: z.string().optional(),
});

export async function mudarStatus(
  input: z.infer<typeof mudarStatusSchema>
): Promise<ActionResult> {
  const session = await auth();
  if (!session) return { error: "Não autorizado" };

  const chamado = await prisma.chamado.findUnique({
    where: { id: input.chamadoId },
    include: { solicitante: true, responsavel: true },
  });
  if (!chamado) return { error: "Chamado não encontrado" };

  const transicoesPermitidas = TRANSICOES_VALIDAS[chamado.status] ?? [];
  if (!transicoesPermitidas.includes(input.novoStatus)) {
    return {
      error: `Transição de ${chamado.status} para ${input.novoStatus} não é permitida`,
    };
  }

  const userId = session.user.id;
  const role = session.user.role;

  // Verificação de quem pode fazer cada transição
  if (input.novoStatus === StatusChamado.CANCELADO) {
    if (role !== "GESTOR" && role !== "SUPERADMIN") {
      return { error: "Apenas GESTOR ou SUPERADMIN podem cancelar chamados" };
    }
  } else if (input.novoStatus === StatusChamado.EM_ANDAMENTO && chamado.status === StatusChamado.ABERTO) {
    if (chamado.responsavelId !== userId && role !== "SUPERADMIN") {
      return { error: "Apenas o responsável pode iniciar o atendimento" };
    }
  } else if (input.novoStatus === StatusChamado.AGUARDANDO_VALIDACAO) {
    if (chamado.responsavelId !== userId && role !== "SUPERADMIN") {
      return { error: "Apenas o responsável pode enviar para validação" };
    }
  } else if (input.novoStatus === StatusChamado.CONCLUIDO) {
    if (chamado.solicitanteId !== userId && role !== "SUPERADMIN") {
      return { error: "Apenas o solicitante pode concluir o chamado" };
    }
  } else if (input.novoStatus === StatusChamado.EM_ANDAMENTO && chamado.status === StatusChamado.AGUARDANDO_VALIDACAO) {
    // Reprovação
    if (chamado.solicitanteId !== userId && role !== "SUPERADMIN") {
      return { error: "Apenas o solicitante pode reprovar o chamado" };
    }
    if (!input.justificativa?.trim()) {
      return { error: "Justificativa é obrigatória ao reprovar um chamado" };
    }
  }

  const updateData: Record<string, unknown> = { status: input.novoStatus };
  if (input.novoStatus === StatusChamado.AGUARDANDO_VALIDACAO) {
    updateData.entregueEm = new Date();
  }
  if (input.novoStatus === StatusChamado.CONCLUIDO) {
    updateData.concluidoEm = new Date();
  }

  await prisma.chamado.update({
    where: { id: input.chamadoId },
    data: updateData,
  });

  await prisma.historicoStatus.create({
    data: {
      statusAntes: chamado.status,
      statusDepois: input.novoStatus,
      justificativa: input.justificativa ?? null,
      chamadoId: input.chamadoId,
      atorId: userId,
    },
  });

  // Notificações por transição
  const notificacoes: Array<{ tipo: string; usuarioId: string }> = [];

  if (input.novoStatus === StatusChamado.AGUARDANDO_VALIDACAO && chamado.solicitanteId) {
    notificacoes.push({ tipo: "ENTREGUE", usuarioId: chamado.solicitanteId });
  }
  if (input.novoStatus === StatusChamado.CONCLUIDO && chamado.responsavelId) {
    notificacoes.push({ tipo: "CONCLUIDO", usuarioId: chamado.responsavelId });
  }
  if (input.novoStatus === StatusChamado.EM_ANDAMENTO && chamado.status === StatusChamado.AGUARDANDO_VALIDACAO) {
    if (chamado.responsavelId) {
      notificacoes.push({ tipo: "REPROVADO", usuarioId: chamado.responsavelId });
    }
  }
  if (input.novoStatus === StatusChamado.CANCELADO) {
    notificacoes.push({ tipo: "CANCELADO", usuarioId: chamado.solicitanteId });
    if (chamado.responsavelId && chamado.responsavelId !== chamado.solicitanteId) {
      notificacoes.push({ tipo: "CANCELADO", usuarioId: chamado.responsavelId });
    }
  }

  if (notificacoes.length > 0) {
    await prisma.notificacao.createMany({
      data: notificacoes.map((n) => ({
        tipo: n.tipo,
        usuarioId: n.usuarioId,
        chamadoId: input.chamadoId,
      })),
    });
  }

  revalidatePath(`/chamados/${input.chamadoId}`);
  revalidatePath("/chamados");
  return { success: true };
}

export async function assumirChamadoIA(chamadoId: string): Promise<ActionResult> {
  const session = await auth();
  if (!session) return { error: "Não autorizado" };

  if (session.user.setorTipo !== "IA") {
    return { error: "Apenas analistas do setor IA podem assumir este chamado" };
  }
  if (!["ANALISTA", "GESTOR", "SUPERADMIN"].includes(session.user.role)) {
    return { error: "Não autorizado" };
  }

  const chamado = await prisma.chamado.findUnique({
    where: { id: chamadoId },
    include: { empresa: false, projeto: { include: { setor: true } } },
  });
  if (!chamado) return { error: "Chamado não encontrado" };
  if (chamado.responsavelId) return { error: "Este chamado já possui responsável" };
  if (chamado.status !== StatusChamado.ABERTO) {
    return { error: "Apenas chamados ABERTOS podem ser assumidos" };
  }

  await prisma.chamado.update({
    where: { id: chamadoId },
    data: {
      responsavelId: session.user.id,
      status: StatusChamado.EM_ANDAMENTO,
    },
  });

  await prisma.historicoStatus.create({
    data: {
      statusAntes: StatusChamado.ABERTO,
      statusDepois: StatusChamado.EM_ANDAMENTO,
      chamadoId,
      atorId: session.user.id,
      justificativa: "Chamado assumido pelo analista",
    },
  });

  await prisma.notificacao.create({
    data: {
      tipo: "CHAMADO_ASSUMIDO",
      usuarioId: chamado.solicitanteId,
      chamadoId,
    },
  });

  revalidatePath(`/chamados/${chamadoId}`);
  revalidatePath("/chamados");
  return { success: true };
}

const transferirSchema = z.object({
  chamadoId: z.string(),
  novoResponsavelId: z.string(),
  justificativa: z.string().optional(),
});

export async function transferirChamado(
  input: z.infer<typeof transferirSchema>
): Promise<ActionResult> {
  const session = await auth();
  if (!session) return { error: "Não autorizado" };
  if (session.user.role !== "GESTOR" && session.user.role !== "SUPERADMIN") {
    return { error: "Não autorizado" };
  }

  const chamado = await prisma.chamado.findUnique({
    where: { id: input.chamadoId },
    include: { responsavel: { include: { setor: true } } },
  });
  if (!chamado) return { error: "Chamado não encontrado" };

  const novoResponsavel = await prisma.usuario.findUnique({
    where: { id: input.novoResponsavelId },
    include: { setor: true },
  });
  if (!novoResponsavel) return { error: "Responsável não encontrado" };

  // GESTOR só pode transferir dentro do seu setor
  if (session.user.role === "GESTOR") {
    if (novoResponsavel.setorId !== session.user.setorId) {
      return { error: "GESTOR só pode transferir chamados dentro do seu setor" };
    }
  }

  await prisma.chamado.update({
    where: { id: input.chamadoId },
    data: { responsavelId: input.novoResponsavelId },
  });

  await prisma.historicoStatus.create({
    data: {
      statusAntes: chamado.status,
      statusDepois: chamado.status,
      chamadoId: input.chamadoId,
      atorId: session.user.id,
      justificativa: `Transferido para ${novoResponsavel.nome}${input.justificativa ? `: ${input.justificativa}` : ""}`,
    },
  });

  await prisma.notificacao.create({
    data: {
      tipo: "TRANSFERIDO",
      usuarioId: input.novoResponsavelId,
      chamadoId: input.chamadoId,
    },
  });

  revalidatePath(`/chamados/${input.chamadoId}`);
  revalidatePath("/chamados");
  return { success: true };
}

export async function cancelarChamado(
  chamadoId: string,
  justificativa?: string
): Promise<ActionResult> {
  const session = await auth();
  if (!session) return { error: "Não autorizado" };
  if (session.user.role !== "GESTOR" && session.user.role !== "SUPERADMIN") {
    return { error: "Apenas GESTOR ou SUPERADMIN podem cancelar chamados" };
  }

  const chamado = await prisma.chamado.findUnique({ where: { id: chamadoId } });
  if (!chamado) return { error: "Chamado não encontrado" };
  if (chamado.status === StatusChamado.CANCELADO) return { error: "Chamado já cancelado" };
  if (chamado.status === StatusChamado.CONCLUIDO) return { error: "Chamado já concluído" };

  await prisma.chamado.update({
    where: { id: chamadoId },
    data: { status: StatusChamado.CANCELADO },
  });

  await prisma.historicoStatus.create({
    data: {
      statusAntes: chamado.status,
      statusDepois: StatusChamado.CANCELADO,
      chamadoId,
      atorId: session.user.id,
      justificativa: justificativa ?? "Cancelado pelo gestor",
    },
  });

  await prisma.notificacao.create({
    data: {
      tipo: "CANCELADO",
      usuarioId: chamado.solicitanteId,
      chamadoId,
    },
  });
  if (chamado.responsavelId && chamado.responsavelId !== chamado.solicitanteId) {
    await prisma.notificacao.create({
      data: {
        tipo: "CANCELADO",
        usuarioId: chamado.responsavelId,
        chamadoId,
      },
    });
  }

  revalidatePath(`/chamados/${chamadoId}`);
  revalidatePath("/chamados");
  return { success: true };
}

export async function adicionarComentario(
  chamadoId: string,
  conteudo: string
): Promise<ActionResult> {
  const session = await auth();
  if (!session) return { error: "Não autorizado" };
  if (session.user.role === "TV") return { error: "Não autorizado" };
  if (!conteudo.trim()) return { error: "Comentário não pode estar vazio" };

  const chamado = await prisma.chamado.findUnique({ where: { id: chamadoId } });
  if (!chamado) return { error: "Chamado não encontrado" };

  await prisma.comentario.create({
    data: { conteudo, chamadoId, autorId: session.user.id },
  });

  revalidatePath(`/chamados/${chamadoId}`);
  return { success: true };
}
