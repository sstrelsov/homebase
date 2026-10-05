// Stached's service worker, scoped to /stached/. It shows a puzzle's push
// (stached-api/push.ts) and opens Stached's home when it's tapped: home, not
// the game, so the stache clock waits for Play. The tap carries the puzzle's
// date, so a game started from it can say so (src/stached/push.ts). It does
// nothing else: with no fetch handler, every page loads just as it would
// without it.

// A new version takes over as soon as it's installed.
self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("push", (event) => {
  // Every push must show something, or iOS stops delivering them.
  let message = { title: "A new puzzle is up", body: "" };
  try {
    message = event.data.json();
  } catch {}
  event.waitUntil(
    self.registration.showNotification(message.title, {
      body: message.body,
      icon: "/images/stached-icon-v2-192.png",
      // Today's replaces yesterday's, if it's still there, and still alerts.
      tag: "puzzle",
      renotify: true,
      data: { date: message.date },
    }),
  );
});

// Opens home: in Stached if it's already open (the page routes there itself,
// src/pages/Stached.tsx), or in a new window at /stached?push=<date>.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const date = event.notification.data?.date;
  const url = new URL("/stached", self.location.origin);
  if (date) url.searchParams.set("push", date);
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      const open = windows.find((client) =>
        new URL(client.url).pathname.startsWith("/stached"),
      );
      if (!open) return self.clients.openWindow(url.href);
      await open.focus();
      open.postMessage({ open: url.pathname, push: date });
    })(),
  );
});
