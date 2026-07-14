"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { SUBJECTS } from "@/lib/types";

export type MaterialView = {
  id: string;
  subject: string;
  name: string;
  publisher: string | null;
  totalPages: number | null;
  level: string;
  active: boolean;
};

export default function MaterialsManager({
  isAdmin,
  initialMaterials,
}: {
  isAdmin: boolean;
  initialMaterials: MaterialView[];
}) {
  const router = useRouter();
  const [materials, setMaterials] = useState<MaterialView[]>(initialMaterials);
  const [subject, setSubject] = useState<string>(SUBJECTS[0]);
  const [name, setName] = useState("");
  const [publisher, setPublisher] = useState("");
  const [totalPages, setTotalPages] = useState("");
  const [level, setLevel] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [showInactive, setShowInactive] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/materials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, name, publisher, totalPages, level }),
    });
    if (res.ok) {
      const data = await res.json();
      setMaterials((prev) => [...prev, data]);
      setName("");
      setPublisher("");
      setTotalPages("");
      setLevel("");
      router.refresh();
    } else {
      const d = await res.json();
      setError(d.error || "失敗しました");
    }
    setBusy(false);
  };

  const update = async (
    m: MaterialView,
    patch: Record<string, string | number | boolean | null>
  ) => {
    const res = await fetch(`/api/materials/${m.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (res.ok) {
      const data = await res.json();
      setMaterials((prev) => prev.map((x) => (x.id === m.id ? { ...x, ...data } : x)));
      router.refresh();
    }
  };

  const del = async (m: MaterialView) => {
    if (!confirm(`「${m.name}」を完全に削除しますか？\n既存記録は自由記述のため影響しませんが、通常は「無効化」を推奨します。`))
      return;
    const res = await fetch(`/api/materials/${m.id}`, { method: "DELETE" });
    if (res.ok) {
      setMaterials((prev) => prev.filter((x) => x.id !== m.id));
      router.refresh();
    } else {
      const d = await res.json();
      alert(d.error || "削除に失敗しました");
    }
  };

  const subjectsInUse = Array.from(new Set(materials.map((m) => m.subject)));
  const visible = materials.filter(
    (m) => (filter === "all" || m.subject === filter) && (showInactive || m.active)
  );

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-lg shadow p-4">
        <h2 className="text-lg font-semibold mb-3">新規追加</h2>
        <form onSubmit={add} className="grid grid-cols-2 md:grid-cols-6 gap-2">
          <select
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1.5 text-sm"
          >
            {SUBJECTS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="教材名"
            className="border border-gray-300 rounded px-2 py-1.5 text-sm col-span-2"
          />
          <input
            value={publisher}
            onChange={(e) => setPublisher(e.target.value)}
            placeholder="出版社(任意)"
            className="border border-gray-300 rounded px-2 py-1.5 text-sm"
          />
          <input
            type="number"
            min={0}
            value={totalPages}
            onChange={(e) => setTotalPages(e.target.value)}
            placeholder="総ページ(任意)"
            className="border border-gray-300 rounded px-2 py-1.5 text-sm"
          />
          <button
            disabled={busy}
            className="bg-primary text-white px-3 py-1.5 rounded text-sm hover:bg-primary-dark disabled:opacity-50"
          >
            追加
          </button>
          <input
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            placeholder="レベル/種別(任意 例: 参考書)"
            className="border border-gray-300 rounded px-2 py-1.5 text-sm col-span-2 md:col-span-3"
          />
        </form>
        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
      </section>

      <section className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <h2 className="text-lg font-semibold">教材一覧</h2>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1 text-sm ml-auto"
          >
            <option value="all">全科目</option>
            {subjectsInUse.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <label className="text-xs text-dark/60 flex items-center gap-1">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
            />
            無効も表示
          </label>
        </div>
        {visible.length === 0 ? (
          <p className="text-sm text-dark/60">登録なし</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-surface">
                <tr>
                  <th className="px-2 py-1 text-left">科目</th>
                  <th className="px-2 py-1 text-left">教材名</th>
                  <th className="px-2 py-1 text-left">出版社</th>
                  <th className="px-2 py-1 text-right">総ページ</th>
                  <th className="px-2 py-1 text-left">レベル/種別</th>
                  <th className="px-2 py-1 text-center">状態</th>
                  <th className="px-2 py-1 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {visible.map((m) => (
                  <tr key={m.id} className={m.active ? "" : "opacity-50"}>
                    <td className="px-2 py-1 whitespace-nowrap">{m.subject}</td>
                    <td className="px-2 py-1">
                      <input
                        defaultValue={m.name}
                        onBlur={(e) =>
                          e.target.value.trim() !== m.name &&
                          e.target.value.trim() &&
                          update(m, { name: e.target.value })
                        }
                        className="border border-gray-300 rounded px-2 py-0.5 text-sm w-full"
                      />
                    </td>
                    <td className="px-2 py-1">
                      <input
                        defaultValue={m.publisher ?? ""}
                        onBlur={(e) =>
                          e.target.value !== (m.publisher ?? "") &&
                          update(m, { publisher: e.target.value })
                        }
                        className="border border-gray-300 rounded px-2 py-0.5 text-sm w-full"
                      />
                    </td>
                    <td className="px-2 py-1 text-right">
                      <input
                        type="number"
                        min={0}
                        defaultValue={m.totalPages ?? ""}
                        onBlur={(e) =>
                          e.target.value !== String(m.totalPages ?? "") &&
                          update(m, { totalPages: e.target.value })
                        }
                        className="border border-gray-300 rounded px-2 py-0.5 text-sm w-20 text-right"
                      />
                    </td>
                    <td className="px-2 py-1">
                      <input
                        defaultValue={m.level}
                        onBlur={(e) =>
                          e.target.value !== m.level && update(m, { level: e.target.value })
                        }
                        className="border border-gray-300 rounded px-2 py-0.5 text-sm w-full"
                      />
                    </td>
                    <td className="px-2 py-1 text-center">
                      <button
                        onClick={() => update(m, { active: !m.active })}
                        className={`text-xs px-2 py-0.5 rounded ${
                          m.active
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-200 text-gray-500"
                        }`}
                      >
                        {m.active ? "有効" : "無効"}
                      </button>
                    </td>
                    <td className="px-2 py-1 text-right">
                      {isAdmin && (
                        <button
                          onClick={() => del(m)}
                          className="text-xs text-red-500 hover:underline"
                        >
                          削除
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-xs text-dark/50 mt-2">
          ※ 各項目は入力後カーソルを外すと自動保存されます。無効化＝新規選択肢から除外（既存記録は保持）。
        </p>
      </section>
    </div>
  );
}
