"use client";

import { useState } from "react";

const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

type Template = {
  weekdays: string;
  startTime: string;
  endTime: string;
} | null;

export default function ShiftTemplateForm({
  teacherId,
  initialTemplate,
  onSaved,
}: {
  teacherId: string;
  initialTemplate: Template;
  onSaved?: () => void;
}) {
  const initWeekdays = initialTemplate
    ? initialTemplate.weekdays.split(",").map(Number)
    : [];

  const [weekdays, setWeekdays] = useState<number[]>(initWeekdays);
  const [startTime, setStartTime] = useState(initialTemplate?.startTime || "14:00");
  const [endTime, setEndTime] = useState(initialTemplate?.endTime || "20:00");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const toggleDay = (d: number) => {
    setWeekdays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()
    );
  };

  const handleSave = async () => {
    if (weekdays.length === 0) {
      setMessage("曜日を1つ以上選択してください");
      return;
    }
    setSaving(true);
    setMessage("");

    const res = await fetch("/api/shift-templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        teacherId,
        weekdays: weekdays.join(","),
        startTime,
        endTime,
      }),
    });
    if (res.ok) {
      setMessage("保存しました");
      onSaved?.();
    } else {
      setMessage("保存に失敗しました");
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!confirm("テンプレートを削除しますか？")) return;
    setSaving(true);
    const res = await fetch(`/api/shift-templates/${teacherId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setWeekdays([]);
      setStartTime("14:00");
      setEndTime("20:00");
      setMessage("削除しました");
      onSaved?.();
    }
    setSaving(false);
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-charcoal mb-2">対象曜日</label>
        <div className="flex gap-2">
          {WEEKDAY_LABELS.map((label, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => toggleDay(idx)}
              className={`w-10 h-10 rounded-full text-sm font-medium ${
                weekdays.includes(idx)
                  ? "bg-primary text-white"
                  : "bg-surface text-charcoal hover:bg-gray-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-charcoal">開始時刻</label>
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-charcoal">終了時刻</label>
          <input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
        </div>
      </div>
      {message && (
        <p className="text-sm text-primary">{message}</p>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="bg-primary text-white px-4 py-2 rounded-md text-sm hover:bg-primary-dark disabled:opacity-50"
        >
          {saving ? "保存中..." : "保存"}
        </button>
        {initialTemplate && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={saving}
            className="bg-white text-red-500 px-4 py-2 rounded-md text-sm border border-red-200 hover:bg-red-50"
          >
            削除
          </button>
        )}
      </div>
    </div>
  );
}
