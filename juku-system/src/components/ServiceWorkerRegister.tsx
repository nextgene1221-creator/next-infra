"use client";

import { useEffect } from "react";

// Service Worker の登録（アプリ化 Phase 1 / 2026-08-24）。
// 通知を有効にした端末では、以後この登録で最新の sw.js に更新される。
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // 登録に失敗しても本体の動作には影響しないので握りつぶす
    });
  }, []);
  return null;
}
