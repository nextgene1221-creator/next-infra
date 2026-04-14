"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function CapacityEditor({
  campus,
  boothCapacity,
  tableCapacity,
}: {
  campus: string;
  boothCapacity: number;
  tableCapacity: number;
}) {
  const router = useRouter();
  const [booth, setBooth] = useState(boothCapacity);
  const [table, setTable] = useState(tableCapacity);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const dirty = booth !== boothCapacity || table !== tableCapacity;

  const save = async () => {
    setSaving(true);
    setMsg("");
    const res = await fetch("/api/study-room/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campus, boothCapacity: booth, tableCapacity: table }),
    });
    if (res.ok) {
      setMsg("保存しました");
      router.refresh();
    } else {
      const d = await res.json();
      setMsg(d.error || "失敗しました");
    }
    setSaving(false);
  };

  return (
    <div className="bg-surface rounded-md p-3 text-sm">
      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="text-xs text-dark/60">ブース席定員</span>
          <input
            type="number"
            min={0}
            value={booth}
            onChange={(e) => setBooth(parseInt(e.target.value) || 0)}
            className="mt-1 block w-full border border-gray-300 rounded px-2 py-1 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-xs text-dark/60">テーブル席定員</span>
          <input
            type="number"
            min={0}
            value={table}
            onChange={(e) => setTable(parseInt(e.target.value) || 0)}
            className="mt-1 block w-full border border-gray-300 rounded px-2 py-1 text-sm"
          />
        </label>
      </div>
      <div className="flex items-center justify-end gap-2 mt-2">
        {msg && <span className="text-xs text-dark/60">{msg}</span>}
        <button
          onClick={save}
          disabled={saving || !dirty}
          className="bg-primary text-white px-3 py-1 rounded text-xs hover:bg-primary-dark disabled:opacity-50"
        >
          {saving ? "..." : "定員を保存"}
        </button>
      </div>
    </div>
  );
}
