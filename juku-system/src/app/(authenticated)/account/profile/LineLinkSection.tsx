"use client";

import { useState } from "react";

export default function LineLinkSection({
  initialLinked,
}: {
  initialLinked: boolean;
}) {
  const [linked, setLinked] = useState(initialLinked);
  const [code, setCode] = useState<string | null>(null);
  const [friendUrl, setFriendUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function issueCode() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/line/link", { method: "POST" });
      if (!res.ok) throw new Error("コードの発行に失敗しました");
      const data = await res.json();
      setCode(data.code);
      setFriendUrl(data.friendUrl || "");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function unlink() {
    if (!confirm("LINE連携を解除しますか？通知が届かなくなります。")) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/line/link", { method: "DELETE" });
      if (!res.ok) throw new Error("解除に失敗しました");
      setLinked(false);
      setCode(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold mb-4">LINE通知連携</h2>

      {linked ? (
        <div>
          <p className="text-sm text-green-700 mb-3">
            ✅ LINE連携済みです。お知らせ通知が公式LINEに届きます。
          </p>
          <button
            onClick={unlink}
            disabled={loading}
            className="text-sm px-3 py-1.5 rounded border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            連携を解除する
          </button>
        </div>
      ) : (
        <div>
          <p className="text-sm text-dark/70 mb-3">
            公式LINEを友だち追加し、下の手順で連携するとお知らせ通知が届くようになります。
          </p>

          {!code ? (
            <button
              onClick={issueCode}
              disabled={loading}
              className="text-sm px-4 py-2 rounded bg-primary text-white hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "発行中…" : "連携コードを発行"}
            </button>
          ) : (
            <div className="space-y-3">
              <ol className="text-sm text-dark/80 list-decimal list-inside space-y-1">
                <li>
                  公式LINEを友だち追加
                  {friendUrl && (
                    <>
                      {" "}
                      <a
                        href={friendUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline"
                      >
                        （友だち追加リンク）
                      </a>
                    </>
                  )}
                </li>
                <li>下の6桁コードを公式LINEのトークに送信</li>
              </ol>
              <div className="text-center py-3 bg-surface rounded">
                <span className="text-3xl font-bold tracking-widest">{code}</span>
                <p className="text-xs text-dark/50 mt-1">
                  有効期限は10分です。切れたら再発行してください。
                </p>
              </div>
              <button
                onClick={issueCode}
                disabled={loading}
                className="text-xs text-dark/60 underline"
              >
                コードを再発行
              </button>
            </div>
          )}
        </div>
      )}

      {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
    </div>
  );
}
