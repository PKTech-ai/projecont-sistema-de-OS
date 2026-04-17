import { NextRequest, NextResponse } from "next/server";
import { getDashboardSession } from "@/lib/contabil-session";
import { prisma } from "@/lib/prisma";

const MENSAGENS: Record<string, string> = {
  CHAMADO_ABERTO: "Novo chamado para você",
  CHAMADO_ASSUMIDO: "Chamado assumido",
  ENTREGUE: "Chamado entregue para validação",
  CONCLUIDO: "Chamado concluído",
  REPROVADO: "Chamado reprovado — precisa de revisão",
  TRANSFERIDO: "Chamado transferido para você",
  CANCELADO: "Chamado cancelado",
};

/**
 * GET /api/notificacoes/poll?since=<ISO>
 *
 * Retorna notificações não lidas do usuário logado criadas após `since`.
 * Usado pelo NotificationPoller para emitir notificações desktop via Web Notifications API.
 */
export async function GET(request: NextRequest) {
  const session = await getDashboardSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sinceParam = request.nextUrl.searchParams.get("since");
  const since = sinceParam ? new Date(sinceParam) : new Date(Date.now() - 60_000);

  const notificacoes = await prisma.notificacao.findMany({
    where: {
      usuarioId: session.user.id,
      lida: false,
      criadoEm: { gt: since },
    },
    include: {
      chamado: { select: { id: true, titulo: true } },
    },
    orderBy: { criadoEm: "asc" },
    take: 20,
  });

  return NextResponse.json({
    notificacoes: notificacoes.map((n) => ({
      id: n.id,
      tipo: n.tipo,
      mensagem: MENSAGENS[n.tipo] ?? "Nova notificação",
      chamadoId: n.chamadoId,
      chamadoTitulo: n.chamado?.titulo ?? null,
      criadoEm: n.criadoEm.toISOString(),
    })),
  });
}
