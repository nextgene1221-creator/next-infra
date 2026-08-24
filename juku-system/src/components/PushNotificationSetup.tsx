"use client";

import { useCallback, useEffect, useState } from "react";

// プッシュ通知の設定（アプリ化 Phase 1 / 2026-08-24）。
//
// ブラウザ / ホーム画面に追加した PWA では Web Push を使う。
// Capacitor のネイティブアプリからは同じ画面を表示するが、購読は
// アプリ側（@capacitor/push-notifications）が FCM トークンを
// /api/push/subscribe に POST するので、この画面は状態表示だけになる。
//
// iOS の制約: Safari のタブのままでは通知を許可できない。
// 「共有 → ホーム画面に追加」してから開き直す必要がある（iOS 16.4+）。

type State =
  | "loading"
  | "unsupported"
  | "ios-needs-install"
  | "denied"
  | "off"
  | "on"
  | "native";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

function isIos(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/** Capacitor のネイティブアプリ内で動いているか */
function isNativeApp(): boolean {
  return Boolean((window as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.());
}

export default function PushNotificationSetup() {
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const detect = useCallback(async () => {
    if (isNativeApp()) {
      setState("native");
      return;
    }
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      // iOS でホーム画面に追加していない場合はここに来る
      setState(isIos() && !isStandalone() ? "ios-needs-install" : "unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setState("denied");
      return;
    }
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    setState(sub ? "on" : "off");
  }, []);

  useEffect(() => {
    detect();
  }, [detect]);

  const enable = async () => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "off");
        setError("通知が許可されませんでした。");
        return;
      }

      const infoRes = await fetch("/api/push/subscribe");
      const info = await infoRes.json();
      if (!info.vapidPublicKey) {
        setError("サーバー側の通知設定（VAPID 鍵）がまだ入っていません。管理者に連絡してください。");
        return;
      }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(info.vapidPublicKey) as BufferSource,
      });

      const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: "web",
          endpoint: json.endpoint,
          p256dh: json.keys?.p256dh,
          auth: json.keys?.auth,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error || "端末の登録に失敗しました");
        return;
      }
      setState("on");
      setMessage("この端末で通知を受け取れるようになりました。");
    } catch (e) {
      setError(`通知の設定に失敗しました: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setState("off");
      setMessage("この端末への通知を停止しました。");
    } catch (e) {
      setError(`停止に失敗しました: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  };

  const sendTest = async () => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/push/test", { method: "POST" });
      const j = await res.json().catch(() => ({}));
      if (res.ok) setMessage(`テスト通知を送りました（${(j.sent || []).join(", ")}）。数秒待っても届かない場合は端末の通知設定を確認してください。`);
      else setError(j.error || "テスト送信に失敗しました");
    } catch {
      setError("テスト送信に失敗しました（通信エラー）");
    } finally {
      setBusy(false);
    }
  };

  const btn = "px-4 py-2 rounded-md text-sm disabled:opacity-50";

  return (
    <div className="bg-white rounded-lg shadow p-6 max-w-2xl">
      <h2 className="text-base font-bold text-dark mb-1">プッシュ通知</h2>
      <p className="text-sm text-dark/60 mb-4">
        面談の予定や退勤打刻の押し忘れなどを、アプリを開いていなくても通知します。端末ごとに設定が必要です。
      </p>

      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
      {message && <p className="text-sm text-green-700 mb-3">{message}</p>}

      {state === "loading" && <p className="text-sm text-dark/50">確認中…</p>}

      {state === "native" && (
        <p className="text-sm text-dark/70">
          アプリ版では通知は自動で設定されます。届かない場合は端末の「設定 → 通知」から
          next infra の通知を許可してください。
        </p>
      )}

      {state === "ios-needs-install" && (
        <div className="text-sm text-dark/70 space-y-2">
          <p className="font-medium text-dark">iPhone / iPad はホーム画面に追加すると通知を受け取れます。</p>
          <ol className="list-decimal list-inside space-y-1 text-dark/70">
            <li>Safari 下部の共有ボタン（□に↑）をタップ</li>
            <li>「ホーム画面に追加」を選ぶ</li>
            <li>ホーム画面のアイコンから開き直して、この画面でもう一度「通知を有効にする」を押す</li>
          </ol>
        </div>
      )}

      {state === "unsupported" && (
        <p className="text-sm text-dark/70">
          このブラウザはプッシュ通知に対応していません。Chrome / Edge / Safari の最新版をお使いください。
        </p>
      )}

      {state === "denied" && (
        <p className="text-sm text-dark/70">
          通知がブロックされています。ブラウザのアドレスバーの鍵アイコン（スマホは「サイトの設定」）から
          このサイトの通知を「許可」に変えてから、ページを再読み込みしてください。
        </p>
      )}

      {state === "off" && (
        <button onClick={enable} disabled={busy} className={`${btn} bg-primary text-white hover:bg-primary-dark`}>
          {busy ? "設定中…" : "この端末で通知を有効にする"}
        </button>
      )}

      {state === "on" && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-800">この端末は有効</span>
          <button onClick={sendTest} disabled={busy} className={`${btn} border border-gray-300 hover:bg-gray-50`}>
            テスト通知を送る
          </button>
          <button onClick={disable} disabled={busy} className={`${btn} border border-red-200 text-red-600 hover:bg-red-50`}>
            この端末で通知を止める
          </button>
        </div>
      )}
    </div>
  );
}
