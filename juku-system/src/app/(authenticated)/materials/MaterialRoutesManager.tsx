"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { SUBJECTS } from "@/lib/types";

// 参考書ルート（新規依頼 B-6）。参考書を学習順に並べたテンプレートを登録・複製する。
// 「段階」は並び順そのもので表現する（別途レベル欄は持たない）。
// 生徒への割り当てと、学習目標/進捗との連携は今回のスコープ外。

export type RouteMaterial = { id: string; name: string; subject: string; publisher: string | null };
export type RouteItemView = { id: string; materialId: string; note: string; material: RouteMaterial };
export type RouteView = {
  id: string;
  name: string;
  subject: string;
  targetLevel: string;
  description: string;
  active: boolean;
  items: RouteItemView[];
};

type DraftItem = { materialId: string; note: string };

const inputCls = "border border-gray-300 rounded-md px-3 py-2 text-sm";

export default function MaterialRoutesManager({
  isAdmin,
  initialRoutes,
  materials,
}: {
  isAdmin: boolean;
  initialRoutes: RouteView[];
  materials: RouteMaterial[];
}) {
  const router = useRouter();
  const [routes, setRoutes] = useState<RouteView[]>(initialRoutes);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  // 編集中のルート（null = 編集していない、"new" = 新規作成）
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [subject, setSubject] = useState<string>(SUBJECTS[0]);
  const [targetLevel, setTargetLevel] = useState("");
  const [description, setDescription] = useState("");
  const [draftItems, setDraftItems] = useState<DraftItem[]>([]);
  const [pickMaterialId, setPickMaterialId] = useState("");

  const materialsById = useMemo(() => new Map(materials.map((m) => [m.id, m])), [materials]);
  // ルートの科目に合う教材を優先して選ばせる
  const pickable = useMemo(
    () => materials.filter((m) => m.subject === subject),
    [materials, subject],
  );

  const resetForm = () => {
    setName("");
    setSubject(SUBJECTS[0]);
    setTargetLevel("");
    setDescription("");
    setDraftItems([]);
    setPickMaterialId("");
    setError("");
  };

  const openNew = () => {
    resetForm();
    setEditingId("new");
  };

  const openEdit = (r: RouteView) => {
    setName(r.name);
    setSubject(r.subject);
    setTargetLevel(r.targetLevel);
    setDescription(r.description);
    setDraftItems(r.items.map((it) => ({ materialId: it.materialId, note: it.note })));
    setPickMaterialId("");
    setError("");
    setEditingId(r.id);
  };

  const closeEdit = () => {
    setEditingId(null);
    resetForm();
  };

  const addItem = () => {
    if (!pickMaterialId) return;
    setDraftItems((prev) => [...prev, { materialId: pickMaterialId, note: "" }]);
    setPickMaterialId("");
  };

  const moveItem = (index: number, dir: -1 | 1) => {
    setDraftItems((prev) => {
      const next = [...prev];
      const to = index + dir;
      if (to < 0 || to >= next.length) return prev;
      [next[index], next[to]] = [next[to], next[index]];
      return next;
    });
  };

  const removeItem = (index: number) =>
    setDraftItems((prev) => prev.filter((_, i) => i !== index));

  const setItemNote = (index: number, note: string) =>
    setDraftItems((prev) => prev.map((it, i) => (i === index ? { ...it, note } : it)));

  const save = async () => {
    if (!name.trim()) {
      setError("ルート名を入力してください");
      return;
    }
    setSaving(true);
    setError("");
    const isNew = editingId === "new";
    const res = await fetch(isNew ? "/api/material-routes" : `/api/material-routes/${editingId}`, {
      method: isNew ? "POST" : "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, subject, targetLevel, description, items: draftItems }),
    });
    if (res.ok) {
      const saved: RouteView = await res.json();
      setRoutes((prev) => {
        const next = isNew ? [...prev, saved] : prev.map((r) => (r.id === saved.id ? saved : r));
        return next.sort(
          (a, b) => a.subject.localeCompare(b.subject, "ja") || a.name.localeCompare(b.name, "ja"),
        );
      });
      closeEdit();
      router.refresh();
    } else {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "保存に失敗しました");
    }
    setSaving(false);
  };

  const duplicate = async (r: RouteView) => {
    setError("");
    const res = await fetch(`/api/material-routes/${r.id}/duplicate`, { method: "POST" });
    if (res.ok) {
      const copy: RouteView = await res.json();
      setRoutes((prev) =>
        [...prev, copy].sort(
          (a, b) => a.subject.localeCompare(b.subject, "ja") || a.name.localeCompare(b.name, "ja"),
        ),
      );
      router.refresh();
    } else {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "複製に失敗しました");
    }
  };

  const setActive = async (r: RouteView, active: boolean) => {
    setError("");
    const res = await fetch(`/api/material-routes/${r.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active }),
    });
    if (res.ok) {
      setRoutes((prev) => prev.map((x) => (x.id === r.id ? { ...x, active } : x)));
      router.refresh();
    } else {
      setError("更新に失敗しました");
    }
  };

  const remove = async (r: RouteView) => {
    if (!confirm(`ルート「${r.name}」を削除しますか？\n（教材そのものは削除されません）`)) return;
    setError("");
    const res = await fetch(`/api/material-routes/${r.id}`, { method: "DELETE" });
    if (res.ok) {
      setRoutes((prev) => prev.filter((x) => x.id !== r.id));
      router.refresh();
    } else {
      setError("削除に失敗しました");
    }
  };

  const visible = routes.filter((r) => showInactive || r.active);

  return (
    <div className="space-y-6">
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center justify-between">
        <label className="flex items-center gap-1 text-sm text-dark/70">
          <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
          無効も表示
        </label>
        {isAdmin && editingId === null && (
          <button
            onClick={openNew}
            className="bg-primary text-white px-4 py-2 rounded-md text-sm hover:bg-primary-dark"
          >
            ＋ ルートを新規作成
          </button>
        )}
      </div>

      {editingId !== null && (
        <div className="bg-white rounded-lg shadow p-4 space-y-4">
          <h2 className="text-lg font-semibold">
            {editingId === "new" ? "ルートを新規作成" : "ルートを編集"}
          </h2>

          <div className="flex flex-wrap gap-3">
            <div>
              <label className="block text-xs text-dark/60 mb-1">ルート名（必須）</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例: 数学 基礎→標準"
                className={`${inputCls} w-64`}
              />
            </div>
            <div>
              <label className="block text-xs text-dark/60 mb-1">科目（必須）</label>
              <select value={subject} onChange={(e) => setSubject(e.target.value)} className={inputCls}>
                {SUBJECTS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-dark/60 mb-1">想定到達レベル</label>
              <input
                value={targetLevel}
                onChange={(e) => setTargetLevel(e.target.value)}
                placeholder="例: 地方国公立レベルまで"
                className={`${inputCls} w-56`}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-dark/60 mb-1">説明</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className={`${inputCls} w-full`}
            />
          </div>

          <div>
            <h3 className="text-sm font-bold text-dark mb-2">
              ステップ（上から順に取り組む）
            </h3>
            {draftItems.length === 0 ? (
              <p className="text-sm text-dark/50 mb-2">まだ教材が登録されていません。</p>
            ) : (
              <ol className="space-y-2 mb-3">
                {draftItems.map((it, i) => {
                  const m = materialsById.get(it.materialId);
                  return (
                    <li key={`${it.materialId}-${i}`} className="border border-gray-200 rounded p-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-primary w-6">{i + 1}.</span>
                        <span className="text-sm font-medium text-dark flex-1">
                          {m ? m.name : "（削除された教材）"}
                          {m?.publisher ? <span className="text-xs text-dark/50 ml-2">{m.publisher}</span> : null}
                        </span>
                        <button onClick={() => moveItem(i, -1)} disabled={i === 0}
                          className="text-xs border border-gray-300 rounded px-2 py-0.5 disabled:opacity-30">↑</button>
                        <button onClick={() => moveItem(i, 1)} disabled={i === draftItems.length - 1}
                          className="text-xs border border-gray-300 rounded px-2 py-0.5 disabled:opacity-30">↓</button>
                        <button onClick={() => removeItem(i)}
                          className="text-xs text-red-600 border border-red-200 rounded px-2 py-0.5 hover:bg-red-50">削除</button>
                      </div>
                      <input
                        value={it.note}
                        onChange={(e) => setItemNote(i, e.target.value)}
                        placeholder="この段階でのねらい・使い方（任意）"
                        className="mt-2 border border-gray-200 rounded px-2 py-1 text-xs w-full"
                      />
                    </li>
                  );
                })}
              </ol>
            )}

            <div className="flex gap-2 items-end">
              <div>
                <label className="block text-xs text-dark/60 mb-1">教材を追加（{subject}）</label>
                <select
                  value={pickMaterialId}
                  onChange={(e) => setPickMaterialId(e.target.value)}
                  className={`${inputCls} w-72`}
                >
                  <option value="">選択してください</option>
                  {pickable.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={addItem}
                disabled={!pickMaterialId}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-40"
              >
                追加
              </button>
            </div>
            {pickable.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">
                {subject} の教材が教材マスタに登録されていません。先に「教材一覧」タブで追加してください。
              </p>
            )}
          </div>

          <div className="flex gap-2 pt-2 border-t border-gray-100">
            <button
              onClick={save}
              disabled={saving}
              className="bg-primary text-white px-4 py-2 rounded-md text-sm hover:bg-primary-dark disabled:opacity-50"
            >
              {saving ? "保存中..." : "保存"}
            </button>
            <button onClick={closeEdit} className="text-dark/60 px-4 py-2 rounded-md text-sm hover:bg-gray-100">
              キャンセル
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="text-lg font-semibold mb-3">ルート一覧</h2>
        {visible.length === 0 ? (
          <p className="text-sm text-dark/50">登録されているルートがありません。</p>
        ) : (
          <div className="space-y-2">
            {visible.map((r) => (
              <div key={r.id} className={`border border-gray-200 rounded-md ${r.active ? "" : "opacity-50"}`}>
                <div
                  className="flex flex-wrap items-center gap-2 p-3 cursor-pointer hover:bg-surface"
                  onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                >
                  <span className="text-xs bg-surface text-dark/70 px-2 py-0.5 rounded">{r.subject}</span>
                  <span className="font-medium text-dark text-sm">{r.name}</span>
                  {r.targetLevel && <span className="text-xs text-dark/50">→ {r.targetLevel}</span>}
                  <span className="text-xs text-dark/60">{r.items.length} ステップ</span>
                  {!r.active && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">無効</span>}
                  <span className="ml-auto text-dark/40 text-xs">{expanded === r.id ? "▲" : "▼"}</span>
                </div>

                {expanded === r.id && (
                  <div className="px-3 pb-3 border-t border-gray-100">
                    {r.description && <p className="text-sm text-dark/70 mt-2">{r.description}</p>}
                    {r.items.length === 0 ? (
                      <p className="text-sm text-dark/50 mt-2">ステップが登録されていません。</p>
                    ) : (
                      <ol className="mt-2 space-y-1">
                        {r.items.map((it, i) => (
                          <li key={it.id} className="text-sm text-dark flex gap-2">
                            <span className="text-primary font-bold w-6">{i + 1}.</span>
                            <span>
                              {it.material.name}
                              {it.material.publisher && (
                                <span className="text-xs text-dark/50 ml-2">{it.material.publisher}</span>
                              )}
                              {it.note && <span className="block text-xs text-dark/60">{it.note}</span>}
                            </span>
                          </li>
                        ))}
                      </ol>
                    )}
                    {isAdmin && (
                      <div className="flex gap-2 mt-3">
                        <button onClick={() => openEdit(r)}
                          className="text-xs border border-gray-300 rounded px-2 py-1 hover:bg-gray-50">編集</button>
                        <button onClick={() => duplicate(r)}
                          className="text-xs border border-gray-300 rounded px-2 py-1 hover:bg-gray-50">複製</button>
                        <button onClick={() => setActive(r, !r.active)}
                          className="text-xs border border-gray-300 rounded px-2 py-1 hover:bg-gray-50">
                          {r.active ? "無効化" : "有効化"}
                        </button>
                        <button onClick={() => remove(r)}
                          className="text-xs text-red-600 border border-red-200 rounded px-2 py-1 hover:bg-red-50">削除</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
