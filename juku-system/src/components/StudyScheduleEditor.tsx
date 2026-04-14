"use client";

import { useState } from "react";

const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

type ScheduleDay = { weekday: number; hours: number };

export default function StudyScheduleEditor({
  studentId,
  initialSchedule,
}: {
  studentId: string;
  initialSchedule: ScheduleDay[];
}) {
  const initialMap = new Map(initialSchedule.map((s) => [s.weekday, s.hours]));
  const [hours, setHours] = useState<number[]>(
    Array.from({ length: 7 }, (_, w) => initialMap.get(w) ?? 0)
  );
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string>("");
  const [error, setError] = useState("");

  const total = hours.reduce((s, h) => s + h, 0);
  const maxHour = Math.max(1, ...hours);
  const todayIdx = new Date().getDay();

  const update = (idx: number, value: number) => {
    setHours((prev) => prev.map((h, i) => (i === idx ? Math.max(0, value) : h)));
  };

  const save = async () => {
    setSaving(true);
    setError("");
    const res = await fetch(`/api/students/${studentId}/study-schedule`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        schedule: hours.map((h, i) => ({ weekday: i, hours: h })),
      }),
    });
    if (res.ok) {
      setSavedAt(new Date().toLocaleTimeString("ja-JP"));
    } else {
      const data = await res.json();
      setError(data.error || "保存に失敗しました");
    }
    setSaving(false);
  };

  const BAR_H = 120;

  return (
    <div>
      {/* 棒グラフ */}
      <div className="grid grid-cols-7 gap-2 mb-2">
        {WEEKDAY_LABELS.map((_, i) => {
          const h = hours[i];
          const pct = maxHour > 0 ? (h / maxHour) * 100 : 0;
          const isToday = i === todayIdx;
          return (
            <div key={`bar-${i}`} className="flex flex-col items-center" style={{ height: BAR_H }}>
              <div className="flex-1 w-full flex items-end justify-center">
                <div
                  className={`w-8 rounded-t transition-all duration-300 ${
                    h === 0
                      ? "bg-gray-200"
                      : isToday
                      ? "bg-gradient-to-t from-primary-dark to-primary ring-2 ring-accent"
                      : "bg-gradient-to-t from-primary-dark to-primary"
                  }`}
                  style={{ height: `${Math.max(h > 0 ? 8 : 2, pct)}%` }}
                  title={`${h}時間`}
                />
              </div>
              <div className="text-[10px] text-dark/60 mt-1">{h > 0 ? `${h}h` : "-"}</div>
            </div>
          );
        })}
      </div>

      {/* 入力 */}
      <div className="grid grid-cols-7 gap-2 mb-3">
        {WEEKDAY_LABELS.map((label, i) => (
          <div key={i} className="text-center">
            <div className={`text-xs mb-1 ${i === 0 ? "text-red-500" : i === 6 ? "text-blue-500" : "text-dark/70"} ${i === todayIdx ? "font-bold" : ""}`}>
              {label}{i === todayIdx && "(今日)"}
            </div>
            <input
              type="number"
              step="0.5"
              min={0}
              max={24}
              value={hours[i]}
              onChange={(e) => update(i, parseFloat(e.target.value) || 0)}
              className="w-full text-center border border-gray-300 rounded-md px-1 py-1 text-sm"
            />
            <div className="text-[10px] text-dark/50 mt-0.5">時間</div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-dark/70">
          週合計: <span className="text-xl font-bold text-primary">{total}</span> 時間
          <span className="ml-2 text-xs text-dark/50">（1日平均 {(total / 7).toFixed(1)}h）</span>
        </span>
        <div className="flex items-center gap-3">
          {savedAt && <span className="text-xs text-green-600">{savedAt} に保存</span>}
          {error && <span className="text-xs text-red-600">{error}</span>}
          <button
            onClick={save}
            disabled={saving}
            className="bg-primary text-white px-4 py-1.5 rounded-md text-sm hover:bg-primary-dark disabled:opacity-50"
          >
            {saving ? "保存中..." : "保存"}
          </button>
        </div>
      </div>
    </div>
  );
}
