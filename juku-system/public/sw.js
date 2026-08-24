// Service Worker（アプリ化 Phase 1 / 2026-08-24）
//
// 役割は 2 つだけに絞っている:
//   1. Web Push を受け取って通知を出す
//   2. 通知をタップしたら該当画面を開く（既に開いていればそのタブを前面に出す）
//
// 画面のキャッシュはしない。生徒・講師のデータは常に最新であるべきで、
// 古いページを返すと出退勤や面談の予定を間違える事故につながるため。

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = { title: "next infra", body: "", url: "/" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    if (event.data) data.body = event.data.text();
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url: data.url || "/" },
      // 同じ内容を連続で出さない
      tag: data.tag || undefined,
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ("focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
