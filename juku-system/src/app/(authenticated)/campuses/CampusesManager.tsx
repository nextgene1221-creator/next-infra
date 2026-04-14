"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Campus = { id: string; code: string; label: string; closeTime: string; sortOrder: number };

export default function CampusesManager({
  isAdmin,
  initialCampuses,
}: {
  isAdmin: boolean;
  initialCampuses: Campus[];
}) {
  const router = useRouter();
  const [campuses, setCampuses] = useState<Campus[]>(initialCampuses);
  const [code, setCode] = useState("");
  const [label, setLabel] = useState("");
  const [closeTime, setCloseTime] = useState("21:00");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/campuses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, label, closeTime, sortOrder: campuses.length }),
    });
    if (res.ok) {
      const data = await res.json();
      setCampuses((prev) => [...prev, data]);
      setCode(""); setLabel(""); setCloseTime("21:00");
      router.refresh();
    } else {
      const d = await res.json();
      setError(d.error || "失敗しました");
    }
    setBusy(false);
  };

  const update = async (c: Campus, patch: Partial<Campus>) => {
    const res = await fetch(`/api/campuses/${c.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (res.ok) {
      const data = await res.json();
      setCampuses((prev) => prev.map((x) => x.id === c.id ? { ...x, ...data } : x));
      router.refresh();
    }
  };

  const del = async (c: Campus) => {
    if (!confirm(`「${c.label}」を削除しますか？\n関連データ（自習室セッションなど）の code 参照は残ります。`)) return;
    const res = await fetch(`/api/campuses/${c.id}`, { method: "DELETE" });
    if (res.ok) {
      setCampuses((prev) => prev.filter((x) => x.id !== c.id));
      router.refresh();
    } else {
      const d = await res.json();
      alert(d.error || "削除に失敗しました");
    }
  };

  return (
    <div className="space-y-6">
      {isAdmin && (
        <section className="bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-semibold mb-3">新規追加</h2>
          <form onSubmit={add} className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <input required value={code} onChange={(e) => setCode(e.target.value)} placeholder="コード (例: yonabaru)" className="border border-gray-300 rounded px-2 py-1.5 text-sm" />
            <input required value={label} onChange={(e) => setLabel(e.target.value)} placeholder="表示名 (例: 与那原校舎)" className="border border-gray-300 rounded px-2 py-1.5 text-sm" />
            <input type="time" value={closeTime} onChange={(e) => setCloseTime(e.target.value)} className="border border-gray-300 rounded px-2 py-1.5 text-sm" />
            <button disabled={busy} className="bg-primary text-white px-3 py-1.5 rounded text-sm hover:bg-primary-dark disabled:opacity-50">追加</button>
          </form>
          {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
        </section>
      )}

      <section className="bg-white rounded-lg shadow p-4">
        <h2 className="text-lg font-semibold mb-3">校舎一覧</h2>
        {campuses.length === 0 ? (
          <p className="text-sm text-dark/60">登録なし</p>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-surface">
              <tr>
                <th className="px-2 py-1 text-left">コード</th>
                <th className="px-2 py-1 text-left">表示名</th>
                <th className="px-2 py-1 text-left">自動退室時刻</th>
                <th className="px-2 py-1 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {campuses.map((c) => (
                <tr key={c.id}>
                  <td className="px-2 py-1 font-mono text-xs">{c.code}</td>
                  <td className="px-2 py-1">
                    <input
                      defaultValue={c.label}
                      onBlur={(e) => e.target.value !== c.label && update(c, { label: e.target.value })}
                      className="border border-gray-300 rounded px-2 py-0.5 text-sm w-full"
                    />
                  </td>
                  <td className="px-2 py-1">
                    <input
                      type="time"
                      defaultValue={c.closeTime}
                      onBlur={(e) => e.target.value !== c.closeTime && update(c, { closeTime: e.target.value })}
                      className="border border-gray-300 rounded px-2 py-0.5 text-sm"
                    />
                  </td>
                  <td className="px-2 py-1 text-right">
                    {isAdmin && (
                      <button onClick={() => del(c)} className="text-xs text-red-500 hover:underline">削除</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="text-xs text-dark/50 mt-2">※ 表示名・自動退室時刻は入力後カーソルを外すと自動保存されます</p>
      </section>
    </div>
  );
}
