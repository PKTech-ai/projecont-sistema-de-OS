// Service Worker — notificações push para o Sistema de OS
// Fica ativo mesmo com a aba/browser fechado.

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload = { title: "Sistema de OS", body: "", url: "/" };
  try {
    payload = { ...payload, ...JSON.parse(event.data.text()) };
  } catch {
    payload.body = event.data.text();
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body || undefined,
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      data: { url: payload.url || "/" },
      // Agrupa por URL para não empilhar notificações do mesmo chamado
      tag: payload.url || "os-notif",
      renotify: true,
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        // Se já há uma aba com o OS aberta, foca e navega
        for (const client of windowClients) {
          if (client.url.includes(self.location.origin)) {
            client.focus();
            client.navigate(url);
            return;
          }
        }
        // Nenhuma aba aberta — abre uma nova
        return clients.openWindow(url);
      })
  );
});
