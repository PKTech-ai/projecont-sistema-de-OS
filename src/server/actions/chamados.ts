"use server";

import { getDashboardSession } from "@/lib/contabil-session";
import { prisma } from "@/lib/prisma";
import { adicionarHorasUteis } from "@/lib/sla";
import { PRAZO_HORAS_UTEIS_POR_PRIORIDADE } from "@/lib/prioridade";
import { dentroDoPrazo } from "@/lib/pontualidade";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  StatusChamado,
  Prioridade,
  TipoSetor,
  TipoChamado,
  TipoMensagemChat,
  type Role,
} from "@prisma/client";
import type { ActionResult } from "@/types";

// Transições válidas na máquina de estados
const TRANSICOES_VALIDAS: Partial<Record<StatusChamado, StatusChamado[]>> = {
  NAO_INICIADO: [StatusChamado.EM_ANDAMENTO, StatusChamado.CANCELADO],
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
  setorDestinoId: z.string(),
  empresaId: z.string().min(1, "Selecione a empresa"),
  projetoId: z.string().optional().nullable(),
  emNomeDeCliente: z.boolean().default(false),
  empresaClienteId: z.string().optional().nullable(),
});

export async function criarChamado(
  input: z.infer<typeof criarChamadoSchema>
): Promise<ActionResult<{ id: string }>> {
  const session = await getDashboardSession();
  if (!session) return { error: "Não autorizado" };
  if (session.user.role === "TV") return { error: "Não autorizado" };

  if (input.emNomeDeCliente) {
    if (session.user.role !== "SAC" && session.user.role !== "SUPERADMIN") {
      return { error: "Chamados em nome de cliente só podem ser abertos pela área de atendimento (SAC)." };
    }
  }

  const parsed = criarChamadoSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  if (parsed.data.emNomeDeCliente && !parsed.data.empresaClienteId) {
    return { error: "Selecione a empresa do cliente." };
  }

  const setorDestino = await prisma.setor.findUnique({
    where: { id: parsed.data.setorDestinoId },
  });
  if (!setorDestino) return { error: "Setor de destino não encontrado" };

  const vinculo = await prisma.vinculoEmpresa.findUnique({
    where: {
      empresaId_tipoServico: {
        empresaId: parsed.data.empresaId,
        tipoServico: setorDestino.tipo,
      },
    },
  });
  if (!vinculo) {
    return {
      error: `Não há responsável cadastrado para esta empresa no setor ${setorDestino.nome}. Cadastre o vínculo (empresa × tipo de serviço) antes de abrir o chamado.`,
    };
  }
  const responsavelId = vinculo.responsavelId;

  const horasPrazo = PRAZO_HORAS_UTEIS_POR_PRIORIDADE[parsed.data.prioridade];
  const prazoSla = adicionarHorasUteis(new Date(), horasPrazo);

  const chamado = await prisma.chamado.create({
    data: {
      titulo: parsed.data.titulo,
      descricao: parsed.data.descricao,
      prioridade: parsed.data.prioridade,
      tipo: TipoChamado.SOLICITACAO,
      setorDestinoId: setorDestino.id,
      emNomeDeCliente: parsed.data.emNomeDeCliente,
      prazoSla,
      solicitanteId: session.user.id,
      responsavelId,
      empresaId: parsed.data.empresaId,
      projetoId: parsed.data.projetoId || null,
      historicoStatus: {
        create: {
          statusAntes: StatusChamado.NAO_INICIADO,
          statusDepois: StatusChamado.NAO_INICIADO,
          atorId: session.user.id,
          justificativa: "Chamado aberto",
        },
      },
    },
  });

  await prisma.notificacao.create({
    data: {
      tipo: "CHAMADO_ABERTO",
      usuarioId: responsavelId,
      chamadoId: chamado.id,
    },
  });

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
  revalidatePath("/sac/novo");
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
  const session = await getDashboardSession();
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

  const agora = new Date();
  await prisma.chamado.update({
    where: { id: parsed.data.chamadoId },
    data: {
      status: StatusChamado.AGUARDANDO_VALIDACAO,
      solucao: parsed.data.solucao,
      entregueEm: agora,
      entregaNoPrazo: dentroDoPrazo(agora, chamado.prazoSla),
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
  const session = await getDashboardSession();
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
    if (chamado.solicitanteId !== userId) {
      return { error: "Apenas quem abriu o chamado pode cancelá-lo" };
    }
  } else if (input.novoStatus === StatusChamado.EM_ANDAMENTO && chamado.status === StatusChamado.NAO_INICIADO) {
    if (chamado.responsavelId !== userId && role !== "SUPERADMIN") {
      return { error: "Apenas o responsável pode iniciar o atendimento" };
    }
  } else if (input.novoStatus === StatusChamado.AGUARDANDO_VALIDACAO) {
    if (chamado.responsavelId !== userId && role !== "SUPERADMIN") {
      return { error: "Apenas o responsável pode enviar para validação" };
    }
  } else if (input.novoStatus === StatusChamado.CONCLUIDO) {
    if (chamado.solicitanteId !== userId) {
      return { error: "Apenas o solicitante pode concluir o chamado" };
    }
  } else if (input.novoStatus === StatusChamado.EM_ANDAMENTO && chamado.status === StatusChamado.AGUARDANDO_VALIDACAO) {
    // Reprovação — somente o solicitante (PRD / auditoria técnica)
    if (chamado.solicitanteId !== userId) {
      return { error: "Apenas o solicitante pode reprovar o chamado" };
    }
    if (!input.justificativa?.trim()) {
      return { error: "Justificativa é obrigatória ao reprovar um chamado" };
    }
  }

  const agora = new Date();
  const updateData: Record<string, unknown> = { status: input.novoStatus };
  if (input.novoStatus === StatusChamado.AGUARDANDO_VALIDACAO) {
    updateData.entregueEm = agora;
    updateData.entregaNoPrazo = dentroDoPrazo(agora, chamado.prazoSla);
  }
  if (input.novoStatus === StatusChamado.CONCLUIDO) {
    updateData.concluidoEm = agora;
    updateData.conclusaoNoPrazo = dentroDoPrazo(agora, chamado.prazoSla);
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

/** Mantido por compatibilidade: chamados passam a ter responsável na abertura (vínculo empresa × setor). */
export async function assumirChamadoIA(_chamadoId: string): Promise<ActionResult> {
  return {
    error:
      "Chamados são abertos já com responsável definido pelo vínculo empresa × setor. Use transferência se precisar alterar o responsável.",
  };
}

const transferirSchema = z.object({
  chamadoId: z.string(),
  novoResponsavelId: z.string(),
  justificativa: z.string().optional(),
});

export async function transferirChamado(
  input: z.infer<typeof transferirSchema>
): Promise<ActionResult> {
  const session = await getDashboardSession();
  if (!session) return { error: "Não autorizado" };

  const podeGestorOuAdmin =
    session.user.role === "GESTOR" || session.user.role === "SUPERADMIN";
  const podeAnalistaResponsavel =
    session.user.role === "ANALISTA";

  if (!podeGestorOuAdmin && !podeAnalistaResponsavel) {
    return { error: "Não autorizado" };
  }

  const chamado = await prisma.chamado.findUnique({
    where: { id: input.chamadoId },
    include: { responsavel: { include: { setor: true } } },
  });
  if (!chamado) return { error: "Chamado não encontrado" };

  if (
    chamado.status === StatusChamado.CONCLUIDO ||
    chamado.status === StatusChamado.CANCELADO
  ) {
    return { error: "Não é possível transferir chamados concluídos ou cancelados." };
  }

  // GESTOR / SUPERADMIN: podem transferir em qualquer status ativo (ex.: EM_ANDAMENTO, AGUARDANDO_VALIDACAO).

  if (podeAnalistaResponsavel) {
    if (chamado.responsavelId !== session.user.id) {
      return { error: "Apenas o responsável atual pode transferir este chamado." };
    }
    const statusPermite = [
      StatusChamado.NAO_INICIADO,
      StatusChamado.EM_ANDAMENTO,
      StatusChamado.AGUARDANDO_VALIDACAO,
    ].includes(chamado.status);
    if (!statusPermite) {
      return { error: "Transferência não disponível neste status." };
    }
  }

  if (session.user.role === "GESTOR" && chamado.setorDestinoId !== session.user.setorId) {
    return { error: "GESTOR só pode transferir chamados destinados ao seu setor" };
  }

  if (!chamado.setorDestinoId) {
    return { error: "Chamado sem setor de destino — não é possível transferir." };
  }

  const novoResponsavel = await prisma.usuario.findUnique({
    where: { id: input.novoResponsavelId },
    include: { setor: true },
  });
  if (!novoResponsavel) return { error: "Responsável não encontrado" };

  if (novoResponsavel.setorId !== chamado.setorDestinoId) {
    return { error: "O novo responsável deve pertencer ao setor de destino do chamado." };
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
  const session = await getDashboardSession();
  if (!session) return { error: "Não autorizado" };
  if (session.user.role === "TV") return { error: "Não autorizado" };

  const chamado = await prisma.chamado.findUnique({ where: { id: chamadoId } });
  if (!chamado) return { error: "Chamado não encontrado" };
  if (chamado.solicitanteId !== session.user.id) {
    return { error: "Apenas quem abriu o chamado pode cancelá-lo" };
  }
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
      justificativa: justificativa ?? "Cancelado pelo solicitante",
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

function podeAtribuirTipoMensagemEspecial(
  role: Role,
  userId: string,
  setorId: string,
  chamado: {
    solicitanteId: string;
    responsavelId: string;
    setorDestinoId: string | null;
  }
): boolean {
  if (role === "SUPERADMIN") return true;
  if (chamado.responsavelId === userId) return true;
  if (role === "GESTOR" && chamado.setorDestinoId === setorId) return true;
  return false;
}

const adicionarComentarioSchema = z.object({
  chamadoId: z.string(),
  conteudo: z.string().min(1, "Mensagem não pode estar vazia"),
  tipo: z.nativeEnum(TipoMensagemChat).default(TipoMensagemChat.NORMAL),
});

export async function adicionarComentario(
  chamadoId: string,
  conteudo: string,
  tipo: TipoMensagemChat = TipoMensagemChat.NORMAL
): Promise<ActionResult> {
  const session = await getDashboardSession();
  if (!session) return { error: "Não autorizado" };
  if (session.user.role === "TV") return { error: "Não autorizado" };

  const parsed = adicionarComentarioSchema.safeParse({ chamadoId, conteudo, tipo });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const chamado = await prisma.chamado.findUnique({ where: { id: chamadoId } });
  if (!chamado) return { error: "Chamado não encontrado" };

  let tipoFinal = parsed.data.tipo;
  if (tipoFinal !== TipoMensagemChat.NORMAL) {
    const ok = podeAtribuirTipoMensagemEspecial(
      session.user.role,
      session.user.id,
      session.user.setorId,
      chamado
    );
    if (!ok) {
      return {
        error:
          "Apenas quem atende o chamado pode marcar mensagem como “Ação necessária” ou “Resolução”.",
      };
    }
  }

  await prisma.comentario.create({
    data: {
      conteudo: parsed.data.conteudo.trim(),
      chamadoId,
      autorId: session.user.id,
      tipo: tipoFinal,
    },
  });

  revalidatePath(`/chamados/${chamadoId}`);
  return { success: true };
}
