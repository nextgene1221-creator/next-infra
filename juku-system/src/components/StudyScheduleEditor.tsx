"use client";

import { useState } from "react";

const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

type Slot = { subject: string; minutes: number };
type ScheduleDay = { weekday: number; hours: number; slots: Slot[] };

export default function StudyScheduleEditor({
  studentId,
  initialSchedule,
  examSubjects,
}: {
  studentId: string;
  initialSchedule: ScheduleDay[];
  examSubjects: string[];
}) {
  const initMap = new Map(initialSchedule.map((s) => [s.weekday, s.slots]));
  const [schedule, setSchedule] = useState<Record<number, Slot[]>>(
    () => Object.fromEntries(Array.from({ length: 7 }, (_, w) => [w, initMap.get(w) ?? []]))
  );
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState("");
  const [error, setError] = useState("");

  const todayIdx = new Date().getDay();

  const dayTotal = (w: number) => (schedule[w] || []).reduce((s, sl) => s + sl.minutes, 0);
  const weekTotal = Array.from({ length: 7 }, (_, w) => dayTotal(w)).reduce((a, b) => a + b, 0);

  const addSlot = (w: number) => {
    // 使われていない科目の中から最初のものをデフォルト選択
    const used = new Set((schedule[w] || []).map((s) => s.subject));
    const available = examSubjects.filter((s) => !used.has(s));
    const defaultSubject = available[0] || examSubjects[0] || "";
    setSchedule((prev) => ({
      ...prev,
      [w]: [...(prev[w] || []), { subject: defaultSubject, minutes: 60 }],
    }));
  };

  const removeSlot = (w: number, idx: number) => {
    setSchedule((prev) => ({
      ...prev,
      [w]: prev[w].filter((_, i) => i !== idx),
    }));
  };

  const updateSlot = (w: number, idx: number, field: "subject" | "minutes", value: string | number) => {
    setSchedule((prev) => ({
      ...prev,
      [w]: prev[w].map((slot, i) =>
        i === idx ? { ...slot, [field]: field === "minutes" ? Number(value) : value } : slot
      ),
    }));
  };

  // ある曜日の設定を他の曜日にコピー
  const copyToAll = (fromW: number) => {
    const source = schedule[fromW] || [];
    setSchedule((prev) => {
      const next = { ...prev };
      for (let w = 0; w < 7; w++) {
        next[w] = source.map((s) => ({ ...s }));
      }
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    setError("");
    const scheduleArr = Array.from({ length: 7 }, (_, w) => ({
      weekday: w,
      hours: dayTotal(w) / 60,
      slots: schedule[w] || [],
    }));
    const res = await fetch(`/api/students/${studentId}/study-schedule`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ schedule: scheduleArr }),
    });
    if (res.ok) {
      setSavedAt(new Date().toLocaleTimeString("ja-JP"));
    } else {
      const data = await res.json();
      setError(data.error || "保存に失敗しました");
    }
    setSaving(false);
  };

  // 10分刻みの選択肢
  const minuteOptions: number[] = [];
  for (let m = 10; m <= 300; m += 10) minuteOptions.push(m);

  return (
    <div>
      {/* 曜日ごとの編集 */}
      <div className="space-y-4 mb-4">
        {WEEKDAY_LABELS.map((label, w) => {
          const total = dayTotal(w);
          const isToday = w === todayIdx;
          return (
            <div key={w} className={`border rounded-lg p-3 ${isToday ? "border-primary bg-primary-light/30" : "border-gray-200"}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${w === 0 ? "text-red-500" : w === 6 ? "text-blue-500" : "text-dark"} ${isToday ? "font-bold" : ""}`}>
                    {label}{isToday && " (今日)"}
                  </span>
                  <span className="text-xs text-dark/60">
                    合計 {total >= 60 ? `${Math.floor(total / 60)}時間${total % 60 > 0 ? `${total % 60}分` : ""}` : total > 0 ? `${total}分` : "0分"}
                  </span>
                </div>
                <div className="flex gap-1">
                  {(schedule[w] || []).length > 0 && (
                    <button
                      onClick={() => copyToAll(w)}
                      className="text-xs text-dark/50 hover:text-primary px-1"
                      title="この曜日の設定を全曜日にコピー"
                    >
                      全曜日に適用
                    </button>
                  )}
                  <button
                    onClick={() => addSlot(w)}
                    disabled={examSubjects.length === 0}
                    className="text-xs text-primary hover:underline disabled:opacity-50"
                  >
                    + 科目追加
                  </button>
                </div>
              </div>
              {(schedule[w] || []).length === 0 ? (
                <p className="text-xs text-dark/40">科目が未設定です</p>
              ) : (
                <div className="space-y-1">
                  {(schedule[w] || []).map((slot, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <select
                        value={slot.subject}
                        onChange={(e) => updateSlot(w, i, "subject", e.target.value)}
                        className="text-sm border border-gray-300 rounded px-2 py-1 bg-white flex-1 min-w-0"
                      >
                        {examSubjects.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                      <select
                        value={slot.minutes}
                        onChange={(e) => updateSlot(w, i, "minutes", e.target.value)}
                        className="text-sm border border-gray-300 rounded px-2 py-1 bg-white w-24"
                      >
                        {minuteOptions.map((m) => (
                          <option key={m} value={m}>
                            {m >= 60 ? `${Math.floor(m / 60)}h${m % 60 > 0 ? `${m % 60}m` : ""}` : `${m}m`}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => removeSlot(w, i)}
                        className="text-red-400 hover:text-red-600 text-xs px-1"
                      >
                        削除
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-dark/70">
          週合計: <span className="text-xl font-bold text-primary">{Math.floor(weekTotal / 60)}</span>
          <span className="text-xs ml-0.5">時間</span>
          {weekTotal % 60 > 0 && <span className="text-xs ml-0.5">{weekTotal % 60}分</span>}
          <span className="ml-2 text-xs text-dark/50">（1日平均 {(weekTotal / 7 / 60).toFixed(1)}h）</span>
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
