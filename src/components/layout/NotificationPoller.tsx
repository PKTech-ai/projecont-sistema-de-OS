"use client";

import { useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

const POLL_INTERVAL_MS = 30_000; // fallback polling a cada 30s (quando SW não disponível)

interface PollNotificacao {
  id: string;
  tipo: string;
  mensagem: string;
  chamadoId: string;
  chamadoTitulo: string | null;
  criadoEm: string;
}

/**
 * NotificationPoller
 *
 * 1. Registra o Service Worker (`/sw.js`) para receber push mesmo com aba fechada.
 * 2. Solicita permissão de notificação ao usuário.
 * 3. Assina o Push API com a chave VAPID pública e salva no servidor.
 * 4. Mantém polling de fallback (30s) para ambientes sem SW ou sem permissão,
 *    mostrando notificações nativas do browser via Notification API.
 */
export function NotificationPoller() {
  const router = useRouter();
  const lastPollRef = useRef<string>(new Date().toISOString());
  const swRegisteredRef = useRef(false);

  // ── Service Worker + Push API ─────────────────────────────────────────────
  const setupPush = useCallback(async () => {
    if (swRegisteredRef.current) return;
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidPublicKey) return; // VAPID não configurado — usa só polling

    try {
      // 1. Registra o service worker
      const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      swRegisteredRef.current = true;

      // 2. Pede permissão (se ainda não concedida)
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return;

      // 3. Assina o Push API
      const existing = await reg.pushManager.getSubscription();
      const subscription =
        existing ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        }));

      // 4. Salva a assinatura no servidor
      await fetch("/api/notificacoes/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: subscription.toJSON() }),
      });
    } catch (err) {
      console.warn("[NotificationPoller] Erro ao configurar push:", err);
    }
  }, []);

  // ── Polling de fallback ───────────────────────────────────────────────────
  // Usado quando: SW não disponível, permissão negada, ou VAPID não configurado.
  // Também atualiza o badge de notificações no header.
  const poll = useCallback(async () => {
    try {
      const since = lastPollRef.current;
      const res = await fetch(`/api/notificacoes/poll?since=${encodeURIComponent(since)}`);
      if (!res.ok) return;

      const data: { notificacoes: PollNotificacao[] } = await res.json();
      lastPollRef.current = new Date().toISOString();

      if (!data.notificacoes?.length) return;

      // Atualiza badge no header
      router.refresh();

      // Notificações nativas de fallback (apenas se SW não está ativo e permissão concedida)
      if (
        typeof Notification !== "undefined" &&
        Notification.permission === "granted" &&
        !swRegisteredRef.current
      ) {
        for (const n of data.notificacoes) {
          const notif = new Notification(n.mensagem, {
            body: n.chamadoTitulo ?? undefined,
            icon: "/favicon.ico",
            tag: n.id,
          });
          const chamadoId = n.chamadoId;
          notif.onclick = () => {
            window.focus();
            router.push(`/chamados/${chamadoId}`);
            notif.close();
          };
        }
      }
    } catch {
      // silencioso
    }
  }, [router]);

  useEffect(() => {
    // Aguarda 2s para não bloquear o carregamento inicial
    const initTimeout = setTimeout(setupPush, 2000);
    const interval = setInterval(poll, POLL_INTERVAL_MS);

    return () => {
      clearTimeout(initTimeout);
      clearInterval(interval);
    };
  }, [setupPush, poll]);

  return null;
}

// Converte chave VAPID base64url para Uint8Array (exigido pelo pushManager.subscribe)
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}
