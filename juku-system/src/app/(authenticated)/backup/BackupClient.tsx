"use client";

import { useState } from "react";

export default function BackupClient() {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");

  const downloadJson = async () => {
    setDownloading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/backup/export");
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const cd = res.headers.get("content-disposition") || "";
      const m = cd.match(/filename="([^"]+)"/);
      const filename = m?.[1] || `juku-backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-dark mb-2">手動バックアップ（JSON）</h2>
        <p className="text-sm text-dark/70 mb-4">
          全テーブルのデータを JSON 形式でダウンロードします。リリース前など、重要操作の直前に取得してください。
        </p>
        <button
          onClick={downloadJson}
          disabled={downloading}
          className="bg-primary text-white px-4 py-2 rounded text-sm hover:bg-primary-dark disabled:opacity-50"
        >
          {downloading ? "生成中..." : "JSON をダウンロード"}
        </button>
        {error && <p className="text-sm text-red-600 mt-3">エラー: {error}</p>}
      </section>

      <section className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-dark mb-2">自動バックアップ（日次）</h2>
        <ul className="text-sm text-dark/70 space-y-1 list-disc list-inside">
          <li>毎日 03:00 JST に GitHub Actions が起動</li>
          <li><code className="bg-gray-100 px-1 rounded">pg_dump</code> で SQL ダンプを生成し Vercel Blob に <strong>非公開</strong> 保存</li>
          <li>ダンプの URL は外部に公開されず、Vercel ダッシュボード経由でのみ取得可能</li>
          <li>30 日経過したバックアップは自動削除</li>
          <li>復旧手順や履歴は GitHub の Actions タブで確認可能</li>
        </ul>
      </section>
    </div>
  );
}
