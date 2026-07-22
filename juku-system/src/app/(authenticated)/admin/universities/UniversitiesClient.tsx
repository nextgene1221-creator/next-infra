"use client";

import { useCallback, useEffect, useState } from "react";

type Row = {
  id: string;
  universityName: string;
  prefecture: string;
  category: string;
  faculty: string;
  department: string;
  method: string;
  targetYear: number | null;
  examDate: string;
  applicationPeriod: string;
  subjects: string;
  capacity: number | null;
  deviationTarget: string;
  examFee: number | null;
  sourceUrl: string;
  lastCrawledAt: string | null;
  revisions: { changedAt: string; summary: string }[];
};

type CrawlResult = {
  university: { id: string; name: string };
  extractedCount: number;
  created: number;
  updated: number;
  unchanged: number;
  changes: { faculty: string; method: string; type: string; summary?: string }[];
};

export default function UniversitiesClient() {
  // --- クロールフォーム ---
  const [uniName, setUniName] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [prefecture, setPrefecture] = useState("");
  const [category, setCategory] = useState("");
  const [crawling, setCrawling] = useState(false);
  const [crawlError, setCrawlError] = useState("");
  const [crawlResult, setCrawlResult] = useState<CrawlResult | null>(null);

  // --- 検索 ---
  const [q, setQ] = useState("");
  const [subject, setSubject] = useState("");
  const [method, setMethod] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [uniCount, setUniCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const search = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (subject) params.set("subject", subject);
      if (method) params.set("method", method);
      const res = await fetch(`/api/admin/universities?${params.toString()}`);
      const json = await res.json();
      if (res.ok) {
        setRows(json.rows || []);
        setUniCount(json.universityCount || 0);
      }
    } finally {
      setLoading(false);
    }
  }, [q, subject, method]);

  useEffect(() => {
    search();
    // 初回のみ
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runCrawl = async () => {
    if (!sourceUrl || crawling) return;
    setCrawling(true);
    setCrawlError("");
    setCrawlResult(null);
    try {
      const res = await fetch("/api/admin/universities/crawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceUrl, universityName: uniName, prefecture, category }),
      });
      const json = await res.json();
      if (!res.ok) {
        setCrawlError(json.error || `エラー (${res.status})`);
      } else {
        setCrawlResult(json);
        search(); // 一覧を更新
      }
    } catch (e) {
      setCrawlError("通信に失敗しました: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setCrawling(false);
    }
  };

  const yen = (n: number | null) => (n == null ? "—" : `¥${n.toLocaleString()}`);

  return (
    <div className="space-y-8">
      {/* クロール */}
      <section className="bg-white rounded-lg shadow-sm p-4 space-y-4">
        <h2 className="font-bold text-dark">大学HPをクロールして収集</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="block text-sm font-medium text-dark mb-1">大学名（推奨・空なら自動判定）</span>
            <input value={uniName} onChange={(e) => setUniName(e.target.value)} placeholder="例: 琉球大学" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
          </label>
          <label className="block">
            <span className="block text-sm font-medium text-dark mb-1">ページURL（入試要項など）</span>
            <input value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="https://…" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
          </label>
          <label className="block">
            <span className="block text-sm font-medium text-dark mb-1">所在地（任意）</span>
            <input value={prefecture} onChange={(e) => setPrefecture(e.target.value)} placeholder="例: 沖縄県" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
          </label>
          <label className="block">
            <span className="block text-sm font-medium text-dark mb-1">区分（任意）</span>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
              <option value="">未選択</option>
              <option value="国立">国立</option>
              <option value="公立">公立</option>
              <option value="私立">私立</option>
            </select>
          </label>
        </div>
        <button onClick={runCrawl} disabled={!sourceUrl || crawling} className="px-4 py-2 rounded-md bg-primary text-white text-sm font-medium disabled:opacity-50">
          {crawling ? "クロール中…（最大1分）" : "クロール実行"}
        </button>

        {crawlError && <div className="bg-red-50 border border-red-200 text-red-700 rounded-md px-4 py-3 text-sm">{crawlError}</div>}
        {crawlResult && (
          <div className="bg-green-50 border border-green-200 rounded-md px-4 py-3 text-sm space-y-1">
            <p className="font-medium text-dark">
              {crawlResult.university.name}：抽出 {crawlResult.extractedCount} 件 → 新規 {crawlResult.created} / 更新 {crawlResult.updated} / 変更なし {crawlResult.unchanged}
            </p>
            {crawlResult.changes.filter((c) => c.type !== "変更なし").map((c, i) => (
              <p key={i} className="text-dark/70 text-xs">
                ・[{c.type}] {c.faculty || "(学部不明)"} {c.method} {c.summary ? `— ${c.summary}` : ""}
              </p>
            ))}
          </div>
        )}
      </section>

      {/* 検索・一覧 */}
      <section className="bg-white rounded-lg shadow-sm p-4 space-y-4">
        <h2 className="font-bold text-dark">収集済みデータの検索</h2>
        <div className="grid gap-3 sm:grid-cols-4">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="大学名・学部" className="border border-gray-300 rounded-md px-3 py-2 text-sm" />
          <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="受験科目（例: 数学）" className="border border-gray-300 rounded-md px-3 py-2 text-sm" />
          <input value={method} onChange={(e) => setMethod(e.target.value)} placeholder="方式（例: 共通テスト）" className="border border-gray-300 rounded-md px-3 py-2 text-sm" />
          <button onClick={search} disabled={loading} className="px-4 py-2 rounded-md bg-dark text-white text-sm font-medium disabled:opacity-50">
            {loading ? "検索中…" : "検索"}
          </button>
        </div>
        <p className="text-xs text-dark/50">{uniCount} 大学 / {rows.length} 件</p>

        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-left text-dark/60 border-b border-gray-200">
                <th className="py-2 pr-3">大学 / 学部</th>
                <th className="py-2 pr-3">方式</th>
                <th className="py-2 pr-3">試験日</th>
                <th className="py-2 pr-3">科目</th>
                <th className="py-2 pr-3">受験料</th>
                <th className="py-2 pr-3">偏差値目安</th>
                <th className="py-2 pr-3">変更履歴</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={7} className="py-6 text-center text-dark/40">データがありません。上のフォームでクロールしてください。</td></tr>
              )}
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-gray-100 align-top">
                  <td className="py-2 pr-3">
                    <div className="font-medium text-dark">{r.universityName}</div>
                    <div className="text-xs text-dark/50">{r.faculty} {r.department} {r.category ? `・${r.category}` : ""}</div>
                  </td>
                  <td className="py-2 pr-3">{r.method || "—"}</td>
                  <td className="py-2 pr-3 whitespace-pre-wrap">{r.examDate || "—"}</td>
                  <td className="py-2 pr-3 max-w-[16rem]">{r.subjects || "—"}</td>
                  <td className="py-2 pr-3">{yen(r.examFee)}</td>
                  <td className="py-2 pr-3">{r.deviationTarget || "—"}</td>
                  <td className="py-2 pr-3">
                    {r.revisions.length === 0 ? (
                      <span className="text-dark/30 text-xs">—</span>
                    ) : (
                      <div className="space-y-0.5">
                        {r.revisions.map((rev, i) => (
                          <div key={i} className="text-xs text-amber-700">
                            {rev.changedAt.slice(0, 10)}: {rev.summary}
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
