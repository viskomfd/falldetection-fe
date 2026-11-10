self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const dashboard = clients.find((client) => client.url.includes("/dashboard"));
      return dashboard ? dashboard.focus() : self.clients.openWindow("/dashboard");
    }),
  );
});
