// QR コード等に埋め込む URL の共通生成（クライアント/サーバー両用・prisma 非依存）。
//
// 背景（新規依頼 B-10）: QR を読み取るアプリの内蔵ブラウザで開かれると、通常ブラウザの
// ログインセッション（Cookie）が引き継がれず、読み取っても着席登録まで進めない。
//
// 対策は 2 段構え。
//  1. URL に `openExternalBrowser=1` を付ける
//     … LINE の内蔵ブラウザを外部ブラウザで開き直させる LINE 独自のパラメータ。
//        **LINE 以外の QR リーダーアプリには効かない**（URL 側から外部ブラウザを強制する
//        標準的な手段は存在せず、各アプリの設定に依存する）。
//  2. 未ログインで開かれた場合はログイン後に元の URL へ戻す（`callbackUrl`）
//     … 1 が効かない内蔵ブラウザでも、ログインさえすれば目的の画面に到達できる。
//
// 新しい QR を追加するときは必ずこのヘルパー経由で URL を組み立てること。

export const EXTERNAL_BROWSER_PARAM = "openExternalBrowser";

/**
 * QR に埋め込む URL を組み立てる。
 * @param origin  例: https://juku-system.vercel.app
 * @param path    例: /study-room/check-in
 * @param params  クエリパラメータ
 */
export function buildQrUrl(
  origin: string,
  path: string,
  params: Record<string, string> = {},
): string {
  const usp = new URLSearchParams(params);
  // 外部ブラウザ指定は必ず最後に付ける（読み取り時に見落とされないよう末尾固定）
  usp.set(EXTERNAL_BROWSER_PARAM, "1");
  return `${origin}${path}?${usp.toString()}`;
}

/**
 * ログイン後の戻り先として安全な相対パスかを検証する。
 * オープンリダイレクトを防ぐため、`/` 始まりの相対パスのみ許可し、
 * `//example.com`（プロトコル相対）や `/\evil.com` は拒否する。
 */
export function safeCallbackUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  if (!raw.startsWith("/")) return null;
  if (raw.startsWith("//") || raw.startsWith("/\\")) return null;
  return raw;
}
