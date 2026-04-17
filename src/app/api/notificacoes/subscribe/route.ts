import { NextRequest, NextResponse } from "next/server";
import { getDashboardSession } from "@/lib/contabil-session";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/notificacoes/subscribe
 * Body: { subscription: PushSubscriptionJSON }
 *
 * Salva (ou remove) a assinatura de push Web do browser logado.
 * Cada device/browser tem sua própria assinatura — atualiza a do usuário
 * com a assinatura mais recente deste device.
 *
 * DELETE /api/notificacoes/subscribe
 * Remove a assinatura (usuário desativou notificações).
 */

export async function POST(request: NextRequest) {
  const session = await getDashboardSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { subscription?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.subscription || typeof body.subscription !== "object") {
    return NextResponse.json({ error: "subscription obrigatório" }, { status: 400 });
  }

  await prisma.usuario.update({
    where: { id: session.user.id },
    data: { pushSubscription: JSON.stringify(body.subscription) },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const session = await getDashboardSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.usuario.update({
    where: { id: session.user.id },
    data: { pushSubscription: null },
  });

  return NextResponse.json({ ok: true });
}
