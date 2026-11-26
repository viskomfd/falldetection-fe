// Lightweight Notification-Only Service Worker (0% camera/AI background activity)

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload = {};
  if (event.data) {
    try {
      payload = event.data.json();
    } catch {
      payload = { body: event.data.text() };
    }
  }

  const title = payload.title || "Kejadian Jatuh Terdeteksi!";
  const targetUrl = payload.url || "/dashboard";

  const options = {
    body: payload.body || "Segera periksa kondisi lansia di dashboard Rumi.",
    icon: "/icon.png",
    badge: "/icon-white.png",
    vibrate: [250, 100, 250, 100, 350],
    requireInteraction: true,
    renotify: true,
    tag: payload.tag || "rumi-fall-alert",
    data: { url: targetUrl, incident_id: payload.incident_id || null },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/dashboard";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((client) => client.url.includes(targetUrl));
      if (existing) return existing.focus();
      if (clients.length > 0 && "navigate" in clients[0]) {
        return clients[0].navigate(targetUrl).then((c) => c?.focus());
      }
      return self.clients.openWindow(targetUrl);
    }),
  );
});
