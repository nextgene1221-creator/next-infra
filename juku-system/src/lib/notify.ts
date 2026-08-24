import webpush from "web-push";
import { prisma } from "@/lib/prisma";
import { pushText } from "@/lib/line";

// 通知ハブ（アプリ化 Phase 1 / 2026-08-24）。
//
// 「誰に・何を・どのチャネルで送るか」をここ 1 か所にまとめる。
// 呼び出し側（cron・API・業務ロジック）はチャネルを意識せず notifyUser() だけを呼ぶ。
//
// チャネル:
//   - web  … Web Push（ブラウザ / ホーム画面に追加した PWA）。VAPID 鍵が要る
//   - fcm  … Capacitor のネイティブアプリ（Android/iOS）。Firebase の設定が入るまでは no-op
//   - line … 既存の LINE Messaging API（生徒のみ連携済み）
//
// 同じ通知を二度送らないための dedupeKey を必須にしている。cron が多重起動しても
// notification_logs の unique 制約で 2 通目が落ちる。

export type NotifyChannel = "web" | "fcm" | "line";

export type NotifyInput = {
  /** 通知の種類。ログの集計と、後で通知設定を作るときのキーにする */
  kind: string;
  /** 重複送信を防ぐキー。例: `meeting_reminder:<meetingId>:2026-08-24` */
  dedupeKey: string;
  title: string;
  body: string;
  /** タップしたときに開くパス。例: `/meetings` */
  url?: string;
  /** 使うチャネル。既定は web + fcm（LINE は生徒向けの既存通知だけで使う） */
  channels?: NotifyChannel[];
};

export type NotifyResult = {
  /** dedupeKey が既にあり送らなかった */
  skipped: boolean;
  /** 実際に 1 件以上届いたチャネル */
  sent: NotifyChannel[];
  errors: string[];
};

const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || "";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:nextgene1221@gmail.com";

let vapidReady = false;
function ensureVapid(): boolean {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return false;
  if (!vapidReady) {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
    vapidReady = true;
  }
  return true;
}

/** クライアントに渡す公開鍵（秘密鍵は絶対に返さない） */
export function vapidPublicKey(): string {
  return VAPID_PUBLIC;
}

/**
 * 1 ユーザーに通知する。
 * dedupeKey が既に送信済みなら何もしない（skipped: true）。
 */
export async function notifyUser(userId: string, input: NotifyInput): Promise<NotifyResult> {
  const channels = input.channels ?? ["web", "fcm"];
  const errors: string[] = [];
  const sent: NotifyChannel[] = [];

  // 先にログを立てて重複を弾く。送信に失敗してもログは残す（同じ通知の連打を防ぐため）。
  try {
    await prisma.notificationLog.create({
      data: {
        userId,
        kind: input.kind,
        dedupeKey: input.dedupeKey,
        title: input.title,
        body: input.body,
        url: input.url || "",
      },
    });
  } catch {
    // unique 制約違反 = 送信済み
    return { skipped: true, sent: [], errors: [] };
  }

  const devices = await prisma.pushDevice.findMany({ where: { userId } });

  if (channels.includes("web")) {
    const webDevices = devices.filter((d) => d.endpoint && d.p256dh && d.auth);
    if (webDevices.length > 0) {
      if (!ensureVapid()) {
        errors.push("VAPID 鍵が未設定のため Web Push を送れませんでした");
      } else {
        const payload = JSON.stringify({
          title: input.title,
          body: input.body,
          url: input.url || "/",
        });
        let ok = 0;
        for (const d of webDevices) {
          try {
            await webpush.sendNotification(
              { endpoint: d.endpoint!, keys: { p256dh: d.p256dh!, auth: d.auth! } },
              payload,
            );
            ok++;
          } catch (e) {
            const status = (e as { statusCode?: number }).statusCode;
            // 404/410 = 購読が失効している。掃除する。
            if (status === 404 || status === 410) {
              await prisma.pushDevice.delete({ where: { id: d.id } }).catch(() => {});
            } else {
              errors.push(`web push 失敗 (${status ?? "unknown"})`);
            }
          }
        }
        if (ok > 0) sent.push("web");
      }
    }
  }

  if (channels.includes("fcm")) {
    const nativeDevices = devices.filter((d) => d.fcmToken);
    if (nativeDevices.length > 0) {
      const r = await sendFcm(
        nativeDevices.map((d) => d.fcmToken!),
        input,
      );
      if (r.sent > 0) sent.push("fcm");
      errors.push(...r.errors);
    }
  }

  if (channels.includes("line")) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { lineUserId: true },
    });
    if (user?.lineUserId) {
      try {
        await pushText(user.lineUserId, `${input.title}\n${input.body}`);
        sent.push("line");
      } catch (e) {
        errors.push(`LINE 送信失敗: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }

  if (sent.length > 0) {
    await prisma.notificationLog
      .update({ where: { dedupeKey: input.dedupeKey }, data: { channels: JSON.stringify(sent) } })
      .catch(() => {});
  }

  return { skipped: false, sent, errors };
}

/** 複数ユーザーへ。dedupeKey にはユーザー ID を足して衝突させない */
export async function notifyUsers(
  userIds: string[],
  build: (userId: string) => NotifyInput,
): Promise<{ sent: number; skipped: number; errors: string[] }> {
  let sentCount = 0;
  let skipped = 0;
  const errors: string[] = [];
  for (const id of userIds) {
    const r = await notifyUser(id, build(id));
    if (r.skipped) skipped++;
    else if (r.sent.length > 0) sentCount++;
    errors.push(...r.errors);
  }
  return { sent: sentCount, skipped, errors };
}

// --- FCM（Capacitor のネイティブアプリ向け）---------------------------------
//
// Firebase プロジェクトのサービスアカウントを FIREBASE_SERVICE_ACCOUNT（JSON 文字列）に入れると有効になる。
// 未設定のうちは no-op（Web Push だけが動く）。Phase 2 でアプリを出すときに設定する。

type FcmResult = { sent: number; errors: string[] };

let cachedToken: { token: string; expiresAt: number } | null = null;

async function fcmAccessToken(): Promise<{ token: string; projectId: string } | null> {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return null;

  let sa: { client_email: string; private_key: string; project_id: string };
  try {
    sa = JSON.parse(raw);
  } catch {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.expiresAt > now + 60) {
    return { token: cachedToken.token, projectId: sa.project_id };
  }

  // サービスアカウントで JWT を組み、OAuth2 のアクセストークンに交換する。
  // google-auth-library を足さずに済ませるため Web Crypto で署名する。
  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };
  const b64url = (o: object) =>
    Buffer.from(JSON.stringify(o)).toString("base64url");
  const unsigned = `${b64url(header)}.${b64url(claim)}`;

  const pem = sa.private_key.replace(/\\n/g, "\n");
  const der = Buffer.from(
    pem.replace(/-----(BEGIN|END) PRIVATE KEY-----/g, "").replace(/\s/g, ""),
    "base64",
  );
  const key = await crypto.subtle.importKey(
    "pkcs8",
    der,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsigned),
  );
  const jwt = `${unsigned}.${Buffer.from(sig).toString("base64url")}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  if (!res.ok) return null;
  const j = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { token: j.access_token, expiresAt: now + j.expires_in };
  return { token: j.access_token, projectId: sa.project_id };
}

async function sendFcm(tokens: string[], input: NotifyInput): Promise<FcmResult> {
  const auth = await fcmAccessToken();
  if (!auth) return { sent: 0, errors: [] }; // 未設定のうちは静かに何もしない

  let sent = 0;
  const errors: string[] = [];
  for (const token of tokens) {
    try {
      const res = await fetch(
        `https://fcm.googleapis.com/v1/projects/${auth.projectId}/messages:send`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${auth.token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: {
              token,
              notification: { title: input.title, body: input.body },
              data: { url: input.url || "/" },
            },
          }),
        },
      );
      if (res.ok) {
        sent++;
      } else if (res.status === 404 || res.status === 403) {
        // トークンが失効している
        await prisma.pushDevice.deleteMany({ where: { fcmToken: token } }).catch(() => {});
      } else {
        errors.push(`fcm 失敗 (${res.status})`);
      }
    } catch (e) {
      errors.push(`fcm 失敗: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return { sent, errors };
}
