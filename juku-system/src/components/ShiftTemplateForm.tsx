"use client";

import { useState } from "react";

const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

export type TemplateDay = {
  weekday: number;
  startTime: string;
  endTime: string;
};

export default function ShiftTemplateForm({
  teacherId,
  initialDays,
  defaultEndTime = "21:00",
  onSaved,
}: {
  teacherId: string;
  initialDays: TemplateDay[];
  /** 新しい曜日を有効化したときの終了時刻の初期値（校舎の閉校時間など） */
  defaultEndTime?: string;
  onSaved?: () => void;
}) {
  const DEFAULT_START = "14:00";

  const [days, setDays] = useState<Record<number, { startTime: string; endTime: string }>>(
    () => Object.fromEntries(initialDays.map((d) => [d.weekday, { startTime: d.startTime, endTime: d.endTime }]))
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const enabledWeekdays = Object.keys(days)
    .map(Number)
    .sort((a, b) => a - b);

  const toggleDay = (d: number) => {
    setDays((prev) => {
      const next = { ...prev };
      if (d in next) {
        delete next[d]; // 無効化 → 値は破棄
      } else {
        next[d] = { startTime: DEFAULT_START, endTime: defaultEndTime };
      }
      return next;
    });
  };

  const updateTime = (d: number, key: "startTime" | "endTime", value: string) => {
    setDays((prev) => ({ ...prev, [d]: { ...prev[d], [key]: value } }));
  };

  const validate = (): string | null => {
    if (enabledWeekdays.length === 0) {
      return "曜日を1つ以上選択してください";
    }
    for (const w of enabledWeekdays) {
      const { startTime, endTime } = days[w];
      if (!startTime || !endTime) return `${WEEKDAY_LABELS[w]}曜の時刻を入力してください`;
      if (startTime >= endTime) return `${WEEKDAY_LABELS[w]}曜の開始時刻は終了時刻より前にしてください`;
    }
    return null;
  };

  const handleSave = async () => {
    const err = validate();
    if (err) {
      setError(err);
      setMessage("");
      return;
    }
    setSaving(true);
    setError("");
    setMessage("");

    const payload = {
      teacherId,
      days: enabledWeekdays.map((w) => ({
        weekday: w,
        startTime: days[w].startTime,
        endTime: days[w].endTime,
      })),
    };

    const res = await fetch("/api/shift-templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      setMessage("保存しました");
      onSaved?.();
    } else {
      setError("保存に失敗しました");
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!confirm("テンプレートを削除しますか？")) return;
    setSaving(true);
    setError("");
    const res = await fetch(`/api/shift-templates/${teacherId}`, { method: "DELETE" });
    if (res.ok) {
      setDays({});
      setMessage("削除しました");
      onSaved?.();
    } else {
      setError("削除に失敗しました");
    }
    setSaving(false);
  };

  const hasAny = initialDays.length > 0;

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
                idx in days
                  ? "bg-primary text-white"
                  : "bg-surface text-charcoal hover:bg-gray-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {enabledWeekdays.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-charcoal mb-2">曜日ごとの勤務時間</label>
          <div className="space-y-2">
            {enabledWeekdays.map((w) => (
              <div key={w} className="flex items-center gap-3">
                <span className="w-8 text-sm font-medium text-charcoal">{WEEKDAY_LABELS[w]}</span>
                <input
                  type="time"
                  value={days[w].startTime}
                  onChange={(e) => updateTime(w, "startTime", e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
                <span className="text-sm text-charcoal">〜</span>
                <input
                  type="time"
                  value={days[w].endTime}
                  onChange={(e) => updateTime(w, "endTime", e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}
      {message && !error && <p className="text-sm text-primary">{message}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="bg-primary text-white px-4 py-2 rounded-md text-sm hover:bg-primary-dark disabled:opacity-50"
        >
          {saving ? "保存中..." : "保存"}
        </button>
        {hasAny && (
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
