"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Category = { id: string; name: string; sortOrder: number };

export default function BlogCategoryManager({
  initialCategories,
}: {
  initialCategories: Category[];
}) {
  const router = useRouter();
  const [categories, setCategories] = useState(initialCategories);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const addCategory = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    setError("");
    const res = await fetch("/api/blog-categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim() }),
    });
    if (res.ok) {
      const cat = await res.json();
      setCategories((prev) => [...prev, cat]);
      setNewName("");
      router.refresh();
    } else {
      const d = await res.json();
      setError(d.error || "追加に失敗しました");
    }
    setSaving(false);
  };

  const deleteCategory = async (id: string) => {
    if (!confirm("このカテゴリを削除しますか？")) return;
    const res = await fetch(`/api/blog-categories/${id}`, { method: "DELETE" });
    if (res.ok) {
      setCategories((prev) => prev.filter((c) => c.id !== id));
      router.refresh();
    } else {
      const d = await res.json();
      alert(d.error || "削除に失敗しました");
    }
  };

  const updateName = async (id: string, name: string) => {
    await fetch(`/api/blog-categories/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 max-w-lg">
      {error && <p className="text-sm text-red-500 mb-3">{error}</p>}

      <div className="space-y-2 mb-4">
        {categories.length === 0 ? (
          <p className="text-sm text-dark/60">カテゴリがありません</p>
        ) : (
          categories.map((c) => (
            <div key={c.id} className="flex items-center gap-2">
              <input
                defaultValue={c.name}
                onBlur={(e) => e.target.value !== c.name && updateName(c.id, e.target.value)}
                className="flex-1 border border-gray-300 rounded-md px-3 py-1.5 text-sm"
              />
              <button
                onClick={() => deleteCategory(c.id)}
                className="text-xs text-red-500 hover:underline"
              >
                削除
              </button>
            </div>
          ))
        )}
      </div>

      <div className="flex gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="新しいカテゴリ名"
          className="flex-1 border border-gray-300 rounded-md px-3 py-1.5 text-sm"
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCategory())}
        />
        <button
          onClick={addCategory}
          disabled={saving || !newName.trim()}
          className="bg-primary text-white px-4 py-1.5 rounded-md text-sm hover:bg-primary-dark disabled:opacity-50"
        >
          追加
        </button>
      </div>
    </div>
  );
}
