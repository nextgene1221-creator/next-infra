"use client";

import { useEffect } from "react";

// Capacitor のネイティブアプリ内で動いているときだけ、FCM の登録トークンを
// サーバーに登録する（アプリ化 Phase 2 / 2026-08-24）。
//
// アプリは本番 URL をそのまま表示する構成なので、Web 側には @capacitor/core を
// 入れていない。ネイティブ側が注入する window.Capacitor を実行時に見て使う。
// ブラウザで開いているときは window.Capacitor が無いので何もしない。

type PushPlugin = {
  checkPermissions: () => Promise<{ receive: string }>;
  requestPermissions: () => Promise<{ receive: string }>;
  register: () => Promise<void>;
  addListener: (
    event: string,
    cb: (payload: { value?: string; notification?: { data?: { url?: string } } }) => void,
  ) => Promise<{ remove: () => void }>;
};

type CapacitorGlobal = {
  isNativePlatform?: () => boolean;
  getPlatform?: () => string;
  Plugins?: { PushNotifications?: PushPlugin };
};

export default function NativePushBridge() {
  useEffect(() => {
    const cap = (window as { Capacitor?: CapacitorGlobal }).Capacitor;
    if (!cap?.isNativePlatform?.()) return;

    const push = cap.Plugins?.PushNotifications;
    if (!push) return;

    const platform = cap.getPlatform?.() === "ios" ? "ios" : "android";
    const removers: (() => void)[] = [];
    let cancelled = false;

    (async () => {
      try {
        let perm = await push.checkPermissions();
        if (perm.receive === "prompt" || perm.receive === "prompt-with-rationale") {
          perm = await push.requestPermissions();
        }
        if (perm.receive !== "granted" || cancelled) return;

        const reg = await push.addListener("registration", (payload) => {
          const token = payload.value;
          if (!token) return;
          fetch("/api/push/subscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ platform, fcmToken: token }),
          }).catch(() => {});
        });
        removers.push(reg.remove);

        // 通知タップで該当画面へ移動する
        const tap = await push.addListener("pushNotificationActionPerformed", (payload) => {
          const url = payload.notification?.data?.url;
          if (url) window.location.assign(url);
        });
        removers.push(tap.remove);

        await push.register();
      } catch {
        // 通知が使えなくても本体の動作は続ける
      }
    })();

    return () => {
      cancelled = true;
      for (const r of removers) {
        try {
          r();
        } catch {
          // noop
        }
      }
    };
  }, []);

  return null;
}
