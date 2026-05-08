"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function InlineTaskCreate() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    setError("");
    const today = new Date().toISOString().split("T")[0];
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        subject: "",
        description: "",
        dueDate: today,
        type: "通常",
        studentId: null,
      }),
    });
    if (res.ok) {
      setTitle("");
      router.refresh();
    } else {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "追加に失敗しました");
    }
    setSaving(false);
  };

  return (
    <form onSubmit={submit} className="bg-white rounded-lg shadow p-3 mb-4 flex gap-2 items-center">
      <input
        type="text"
        required
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="タスクをタイトルだけで素早く追加 (種別: 通常 / 期日: 今日)"
        className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
      />
      <button
        type="submit"
        disabled={saving || !title.trim()}
        className="bg-primary text-white px-4 py-2 rounded-md text-sm hover:bg-primary-dark disabled:opacity-50 whitespace-nowrap"
      >
        {saving ? "追加中..." : "+ 追加"}
      </button>
      {error && <span className="text-xs text-red-600 ml-2">{error}</span>}
    </form>
  );
}
