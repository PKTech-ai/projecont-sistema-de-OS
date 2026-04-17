import { prisma } from "@/lib/prisma";
import { getWebPush } from "@/lib/web-push";

export interface PushPayload {
  title: string;
  body?: string;
  url?: string;
}

/**
 * Envia uma notificação push para um usuário pelo seu ID.
 * Silencioso se VAPID não estiver configurado ou usuário sem assinatura.
 */
export async function sendPushToUser(usuarioId: string, payload: PushPayload): Promise<void> {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return; // VAPID não configurado

  const usuario = await prisma.usuario.findUnique({
    where: { id: usuarioId },
    select: { pushSubscription: true },
  });
  if (!usuario?.pushSubscription) return;

  let subscription: webpush.PushSubscription;
  try {
    subscription = JSON.parse(usuario.pushSubscription);
  } catch {
    return;
  }

  try {
    const wp = getWebPush();
    await wp.sendNotification(subscription, JSON.stringify(payload));
  } catch (err: any) {
    // 410 Gone = assinatura expirou — limpar do banco
    if (err?.statusCode === 410) {
      await prisma.usuario.update({
        where: { id: usuarioId },
        data: { pushSubscription: null },
      });
    }
    // Outros erros: log e ignora (não bloqueia a ação principal)
    console.error(`[send-push] Falha ao enviar push para ${usuarioId}:`, err?.message ?? err);
  }
}

// import necessário para o tipo
import webpush from "web-push";
