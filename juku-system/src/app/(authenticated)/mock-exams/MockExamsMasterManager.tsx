"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MOCK_EXAM_GRADE_LEVELS } from "@/lib/mockExamMaster";

export type MockExamView = {
  id: string;
  name: string;
  provider: string;
  gradeLevels: string[];
  sortOrder: number;
  active: boolean;
  usedCount: number;
};

export default function MockExamsMasterManager({
  isAdmin,
  initialExams,
}: {
  isAdmin: boolean;
  initialExams: MockExamView[];
}) {
  const router = useRouter();
  const [exams, setExams] = useState<MockExamView[]>(initialExams);
  const [showInactive, setShowInactive] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // 新規追加フォーム
  const [name, setName] = useState("");
  const [provider, setProvider] = useState("");
  const [gradeLevels, setGradeLevels] = useState<string[]>([]);
  const [sortOrder, setSortOrder] = useState("0");

  const toggleGrade = (value: string) =>
    setGradeLevels((prev) => (prev.includes(value) ? prev.filter((g) => g !== value) : [...prev, value]));

  const add = async () => {
    if (!name.trim()) {
      setError("模試名を入力してください");
      return;
    }
    setSaving(true);
    setError("");
    const res = await fetch("/api/mock-exam-masters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, provider, gradeLevels, sortOrder }),
    });
    if (res.ok) {
      const created = await res.json();
      setExams((prev) =>
        [
          ...prev,
          {
            id: created.id,
            name: created.name,
            provider: created.provider,
            gradeLevels: JSON.parse(created.gradeLevels || "[]"),
            sortOrder: created.sortOrder,
            active: created.active,
            usedCount: 0,
          },
        ].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "ja")),
      );
      setName("");
      setProvider("");
      setGradeLevels([]);
      setSortOrder("0");
      router.refresh();
    } else {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "追加に失敗しました");
    }
    setSaving(false);
  };

  const setActive = async (id: string, active: boolean) => {
    setError("");
    const res = await fetch(`/api/mock-exam-masters/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active }),
    });
    if (res.ok) {
      setExams((prev) => prev.map((e) => (e.id === id ? { ...e, active } : e)));
      router.refresh();
    } else {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "更新に失敗しました");
    }
  };

  const remove = async (e: MockExamView) => {
    if (!confirm(`「${e.name}」を完全に削除しますか？\n通常は「無効化」を推奨します。`)) return;
    setError("");
    const res = await fetch(`/api/mock-exam-masters/${e.id}`, { method: "DELETE" });
    if (res.ok) {
      setExams((prev) => prev.filter((x) => x.id !== e.id));
      router.refresh();
    } else {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "削除に失敗しました");
    }
  };

  const visible = exams.filter((e) => showInactive || e.active);
  const inputCls = "border border-gray-300 rounded-md px-3 py-2 text-sm";

  return (
    <div className="space-y-6">
      {error && <p className="text-sm text-red-600">{error}</p>}

      {isAdmin && (
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-semibold mb-3">新規追加</h2>
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs text-dark/60 mb-1">模試名（必須）</label>
              <input
                value={name}
                onChange={(ev) => setName(ev.target.value)}
                placeholder="例: 全統記述模試"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs text-dark/60 mb-1">主催</label>
              <input
                value={provider}
                onChange={(ev) => setProvider(ev.target.value)}
                placeholder="例: 河合塾"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs text-dark/60 mb-1">対象学年</label>
              <div className="flex gap-2 items-center h-[38px]">
                {MOCK_EXAM_GRADE_LEVELS.map((g) => (
                  <label key={g.value} className="flex items-center gap-1 text-sm">
                    <input
                      type="checkbox"
                      checked={gradeLevels.includes(g.value)}
                      onChange={() => toggleGrade(g.value)}
                    />
                    {g.label}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs text-dark/60 mb-1">並び順</label>
              <input
                type="number"
                value={sortOrder}
                onChange={(ev) => setSortOrder(ev.target.value)}
                className={`${inputCls} w-24`}
              />
            </div>
            <button
              onClick={add}
              disabled={saving}
              className="bg-primary text-white px-4 py-2 rounded-md text-sm hover:bg-primary-dark disabled:opacity-50"
            >
              {saving ? "追加中..." : "追加"}
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">模試一覧</h2>
          <label className="flex items-center gap-1 text-sm text-dark/70">
            <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
            無効も表示
          </label>
        </div>

        {visible.length === 0 ? (
          <p className="text-sm text-dark/50">登録されている模試がありません。</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-dark/60 border-b">
                <th className="text-right py-2 w-16">並び順</th>
                <th className="text-left py-2">模試名</th>
                <th className="text-left py-2">主催</th>
                <th className="text-left py-2">対象学年</th>
                <th className="text-right py-2 w-20">使用件数</th>
                <th className="text-left py-2 w-16">状態</th>
                {isAdmin && <th className="text-right py-2 w-40">操作</th>}
              </tr>
            </thead>
            <tbody>
              {visible.map((e) => (
                <tr key={e.id} className={`border-b border-gray-50 ${e.active ? "" : "opacity-50"}`}>
                  <td className="py-2 text-right">{e.sortOrder}</td>
                  <td className="py-2 font-medium text-dark">{e.name}</td>
                  <td className="py-2 text-dark/70">{e.provider || "—"}</td>
                  <td className="py-2 text-dark/70">
                    {e.gradeLevels.length === 0
                      ? "—"
                      : e.gradeLevels
                          .map((g) => MOCK_EXAM_GRADE_LEVELS.find((x) => x.value === g)?.label || g)
                          .join("・")}
                  </td>
                  <td className="py-2 text-right text-dark/70">{e.usedCount}</td>
                  <td className="py-2">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs ${
                        e.active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {e.active ? "有効" : "無効"}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="py-2 text-right space-x-2">
                      <button
                        onClick={() => setActive(e.id, !e.active)}
                        className="text-xs border border-gray-300 rounded px-2 py-1 hover:bg-gray-50"
                      >
                        {e.active ? "無効化" : "有効化"}
                      </button>
                      <button
                        onClick={() => remove(e)}
                        className="text-xs text-red-600 border border-red-200 rounded px-2 py-1 hover:bg-red-50"
                      >
                        削除
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
