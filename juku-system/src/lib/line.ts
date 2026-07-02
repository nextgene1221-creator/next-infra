import crypto from "crypto";

// LINE Messaging API のエンドポイント
const TOKEN_URL = "https://api.line.me/oauth2/v3/token";
const PUSH_URL = "https://api.line.me/v2/bot/message/push";
const REPLY_URL = "https://api.line.me/v2/bot/message/reply";

// ステートレス チャネルアクセストークン（有効期限 ~15分）をメモリキャッシュ
let cachedToken: { token: string; expiresAt: number } | null = null;

/**
 * Channel ID / Channel secret から「ステートレス チャネルアクセストークン」を都度発行する。
 * 事前発行のアクセストークンは不要（client_credentials 認証）。
 */
export async function getChannelToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 60_000) return cachedToken.token;

  const id = process.env.LINE_CHANNEL_ID;
  const secret = process.env.LINE_CHANNEL_SECRET;
  if (!id || !secret) {
    throw new Error("LINE_CHANNEL_ID / LINE_CHANNEL_SECRET が設定されていません");
  }

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: id,
      client_secret: secret,
    }),
  });
  if (!res.ok) {
    throw new Error(`LINE token error ${res.status}: ${await res.text()}`);
  }
  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { token: data.access_token, expiresAt: now + data.expires_in * 1000 };
  return data.access_token;
}

/** 指定ユーザーへテキストを push 送信 */
export async function pushText(to: string, text: string): Promise<void> {
  const token = await getChannelToken();
  const res = await fetch(PUSH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ to, messages: [{ type: "text", text }] }),
  });
  if (!res.ok) {
    throw new Error(`LINE push error ${res.status}: ${await res.text()}`);
  }
}

/** webhook の replyToken へテキスト返信（失敗しても投げない） */
export async function replyText(replyToken: string, text: string): Promise<void> {
  try {
    const token = await getChannelToken();
    await fetch(REPLY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ replyToken, messages: [{ type: "text", text }] }),
    });
  } catch {
    /* 返信失敗は連携処理自体を止めない */
  }
}

/** webhook の署名検証（X-Line-Signature = HMAC-SHA256(channel secret, rawBody) の base64） */
export function verifyLineSignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.LINE_CHANNEL_SECRET;
  if (!secret || !signature) return false;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("base64");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
