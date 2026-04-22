"use client";

import { useState } from "react";

const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

// 科目ごとの色（最大20色）
const SUBJECT_COLORS = [
  "#3b82f6", "#ef4444", "#22c55e", "#f59e0b", "#8b5cf6",
  "#ec4899", "#14b8a6", "#f97316", "#6366f1", "#84cc16",
  "#06b6d4", "#e11d48", "#10b981", "#d97706", "#7c3aed",
  "#db2777", "#0d9488", "#ea580c", "#4f46e5", "#65a30d",
];

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
  const [editingDay, setEditingDay] = useState<number | null>(null);

  const todayIdx = new Date().getDay();
  const dayTotal = (w: number) => (schedule[w] || []).reduce((s, sl) => s + sl.minutes, 0);
  const weekTotal = Array.from({ length: 7 }, (_, w) => dayTotal(w)).reduce((a, b) => a + b, 0);
  const maxMinutes = Math.max(1, ...Array.from({ length: 7 }, (_, w) => dayTotal(w)));

  // 使用中の全科目 → 色マップ
  const allSubjects = new Set<string>();
  for (let w = 0; w < 7; w++) for (const s of schedule[w] || []) allSubjects.add(s.subject);
  const subjectColorMap = new Map<string, string>();
  let ci = 0;
  for (const s of examSubjects) {
    if (allSubjects.has(s)) {
      subjectColorMap.set(s, SUBJECT_COLORS[ci % SUBJECT_COLORS.length]);
      ci++;
    }
  }

  // --- 編集モーダル用 ---
  const addSlot = (w: number) => {
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

  const copyToAll = (fromW: number) => {
    const source = schedule[fromW] || [];
    setSchedule((prev) => {
      const next = { ...prev };
      for (let w = 0; w < 7; w++) next[w] = source.map((s) => ({ ...s }));
      return next;
    });
    setEditingDay(null);
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

  const minuteOptions: number[] = [];
  for (let m = 10; m <= 300; m += 10) minuteOptions.push(m);

  const BAR_H = 120;

  const formatMinutes = (m: number) =>
    m >= 60 ? `${Math.floor(m / 60)}h${m % 60 > 0 ? `${m % 60}m` : ""}` : `${m}m`;

  return (
    <div>
      {/* 積み上げ棒グラフ */}
      <div className="grid grid-cols-7 gap-2 mb-2">
        {WEEKDAY_LABELS.map((_, w) => {
          const total = dayTotal(w);
          const pct = maxMinutes > 0 ? (total / maxMinutes) * 100 : 0;
          const isToday = w === todayIdx;
          const slots = schedule[w] || [];
          return (
            <div
              key={`bar-${w}`}
              className="flex flex-col items-center cursor-pointer"
              style={{ height: BAR_H }}
              onClick={() => setEditingDay(w)}
              title="クリックして編集"
            >
              <div className="flex-1 w-full flex items-end justify-center">
                <div
                  className={`w-8 rounded-t overflow-hidden transition-all duration-300 ${isToday ? "ring-2 ring-accent" : ""}`}
                  style={{ height: `${Math.max(total > 0 ? 8 : 2, pct)}%` }}
                >
                  {/* 積み上げセグメント（下から上へ） */}
                  <div className="w-full h-full flex flex-col-reverse">
                    {total > 0 ? slots.map((sl, i) => {
                      const segPct = (sl.minutes / total) * 100;
                      const color = subjectColorMap.get(sl.subject) || "#94a3b8";
                      return (
                        <div
                          key={i}
                          style={{ height: `${segPct}%`, backgroundColor: color }}
                          title={`${sl.subject} ${formatMinutes(sl.minutes)}`}
                        />
                      );
                    }) : (
                      <div className="w-full h-full bg-gray-200" />
                    )}
                  </div>
                </div>
              </div>
              <div className="text-[10px] text-dark/60 mt-1">
                {total > 0 ? formatMinutes(total) : "-"}
              </div>
            </div>
          );
        })}
      </div>

      {/* 曜日ラベル */}
      <div className="grid grid-cols-7 gap-2 mb-3">
        {WEEKDAY_LABELS.map((label, w) => {
          const isToday = w === todayIdx;
          return (
            <div
              key={w}
              className={`text-center text-xs cursor-pointer hover:text-primary ${
                w === 0 ? "text-red-500" : w === 6 ? "text-blue-500" : "text-dark/70"
              } ${isToday ? "font-bold" : ""}`}
              onClick={() => setEditingDay(w)}
            >
              {label}{isToday && " (今日)"}
            </div>
          );
        })}
      </div>

      {/* 凡例 */}
      {subjectColorMap.size > 0 && (
        <div className="flex flex-wrap gap-x-3 gap-y-1 mb-3">
          {Array.from(subjectColorMap.entries()).map(([subject, color]) => (
            <span key={subject} className="flex items-center gap-1 text-[10px] text-dark/60">
              <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: color }} />
              {subject}
            </span>
          ))}
        </div>
      )}

      {/* 週合計 + 保存 */}
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

      {/* 曜日編集モーダル */}
      {editingDay !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setEditingDay(null)}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-semibold text-dark">
                {WEEKDAY_LABELS[editingDay]}曜日の学習科目
              </h3>
              <button onClick={() => setEditingDay(null)} className="text-dark/60 hover:text-dark">
                ✕
              </button>
            </div>

            {(schedule[editingDay] || []).length === 0 ? (
              <p className="text-sm text-dark/40 mb-3">科目が未設定です</p>
            ) : (
              <div className="space-y-2 mb-3">
                {(schedule[editingDay] || []).map((slot, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-sm shrink-0"
                      style={{ backgroundColor: subjectColorMap.get(slot.subject) || "#94a3b8" }}
                    />
                    <select
                      value={slot.subject}
                      onChange={(e) => updateSlot(editingDay, i, "subject", e.target.value)}
                      className="text-sm border border-gray-300 rounded px-2 py-1 bg-white flex-1 min-w-0"
                    >
                      {examSubjects.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <select
                      value={slot.minutes}
                      onChange={(e) => updateSlot(editingDay, i, "minutes", e.target.value)}
                      className="text-sm border border-gray-300 rounded px-2 py-1 bg-white w-24"
                    >
                      {minuteOptions.map((m) => (
                        <option key={m} value={m}>{formatMinutes(m)}</option>
                      ))}
                    </select>
                    <button onClick={() => removeSlot(editingDay, i)} className="text-red-400 hover:text-red-600 text-sm">
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between">
              <button
                onClick={() => addSlot(editingDay)}
                disabled={examSubjects.length === 0}
                className="text-sm text-primary hover:underline disabled:opacity-50"
              >
                + 科目を追加
              </button>
              <div className="flex gap-2">
                {(schedule[editingDay] || []).length > 0 && (
                  <button
                    onClick={() => copyToAll(editingDay)}
                    className="text-xs text-dark/50 hover:text-primary border border-gray-200 px-2 py-1 rounded"
                  >
                    全曜日に適用
                  </button>
                )}
                <button
                  onClick={() => setEditingDay(null)}
                  className="bg-primary text-white px-3 py-1 rounded text-sm hover:bg-primary-dark"
                >
                  閉じる
                </button>
              </div>
            </div>

            <div className="mt-3 text-xs text-dark/50 text-right">
              合計: {formatMinutes(dayTotal(editingDay))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
