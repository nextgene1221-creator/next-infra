"use client";

import { useState, useRef, useCallback } from "react";

const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

const SUBJECT_COLORS = [
  "#3b82f6", "#ef4444", "#22c55e", "#f59e0b", "#8b5cf6",
  "#ec4899", "#14b8a6", "#f97316", "#6366f1", "#84cc16",
  "#06b6d4", "#e11d48", "#10b981", "#d97706", "#7c3aed",
  "#db2777", "#0d9488", "#ea580c", "#4f46e5", "#65a30d",
];

const STEP = 10; // 10分刻み
const MAX_MINUTES = 1440; // 24時間

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
  const [activeSubject, setActiveSubject] = useState<string | null>(null); // null = 合計

  const todayIdx = new Date().getDay();
  const dayTotal = (w: number) => (schedule[w] || []).reduce((s, sl) => s + sl.minutes, 0);
  const weekTotal = Array.from({ length: 7 }, (_, w) => dayTotal(w)).reduce((a, b) => a + b, 0);

  const getSubjectMinutes = (w: number, subject: string) => {
    const slot = (schedule[w] || []).find((s) => s.subject === subject);
    return slot?.minutes || 0;
  };

  const setSubjectMinutes = (w: number, subject: string, minutes: number) => {
    const clamped = Math.max(0, Math.min(MAX_MINUTES, Math.round(minutes / STEP) * STEP));
    setSchedule((prev) => {
      const slots = [...(prev[w] || [])];
      const idx = slots.findIndex((s) => s.subject === subject);
      if (clamped === 0) {
        if (idx >= 0) slots.splice(idx, 1);
      } else if (idx >= 0) {
        slots[idx] = { ...slots[idx], minutes: clamped };
      } else {
        slots.push({ subject, minutes: clamped });
      }
      return { ...prev, [w]: slots };
    });
  };

  // 色マップ
  const subjectColorMap = new Map<string, string>();
  examSubjects.forEach((s, i) => {
    subjectColorMap.set(s, SUBJECT_COLORS[i % SUBJECT_COLORS.length]);
  });

  // 科目モードの最大値（グラフスケール用）
  const maxVal = activeSubject
    ? Math.max(STEP, ...Array.from({ length: 7 }, (_, w) => getSubjectMinutes(w, activeSubject)))
    : Math.max(STEP, ...Array.from({ length: 7 }, (_, w) => dayTotal(w)));

  // --- ドラッグ ---
  const dragRef = useRef<{
    weekday: number;
    startY: number;
    startMinutes: number;
    barHeight: number;
  } | null>(null);
  const [dragValue, setDragValue] = useState<{ w: number; minutes: number } | null>(null);

  const handleDragStart = useCallback(
    (w: number, e: React.MouseEvent | React.TouchEvent) => {
      if (!activeSubject) return;
      e.preventDefault();
      const barEl = (e.currentTarget as HTMLElement).closest("[data-bar]") as HTMLElement;
      if (!barEl) return;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
      const barAreaHeight = barEl.clientHeight;
      dragRef.current = {
        weekday: w,
        startY: clientY,
        startMinutes: getSubjectMinutes(w, activeSubject),
        barHeight: barAreaHeight,
      };
      setDragValue({ w, minutes: getSubjectMinutes(w, activeSubject) });

      const onMove = (ev: MouseEvent | TouchEvent) => {
        if (!dragRef.current) return;
        const cy = "touches" in ev ? ev.touches[0].clientY : ev.clientY;
        const dy = dragRef.current.startY - cy;
        const minutesPerPx = MAX_MINUTES / dragRef.current.barHeight;
        const raw = dragRef.current.startMinutes + dy * minutesPerPx;
        const snapped = Math.max(0, Math.min(MAX_MINUTES, Math.round(raw / STEP) * STEP));
        setDragValue({ w: dragRef.current.weekday, minutes: snapped });
      };

      const onEnd = () => {
        if (dragRef.current && activeSubject) {
          const dv = dragRef.current;
          // 最終値を読み取る
          setDragValue((cur) => {
            if (cur) setSubjectMinutes(dv.weekday, activeSubject, cur.minutes);
            return null;
          });
        }
        dragRef.current = null;
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onEnd);
        document.removeEventListener("touchmove", onMove);
        document.removeEventListener("touchend", onEnd);
      };

      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onEnd);
      document.addEventListener("touchmove", onMove, { passive: false });
      document.addEventListener("touchend", onEnd);
    },
    [activeSubject, schedule]
  );

  // +/- ボタン
  const stepUp = (w: number) => {
    if (!activeSubject) return;
    setSubjectMinutes(w, activeSubject, getSubjectMinutes(w, activeSubject) + STEP);
  };
  const stepDown = (w: number) => {
    if (!activeSubject) return;
    setSubjectMinutes(w, activeSubject, getSubjectMinutes(w, activeSubject) - STEP);
  };

  // モーダル用
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
    setSchedule((prev) => ({ ...prev, [w]: prev[w].filter((_, i) => i !== idx) }));
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
    if (res.ok) setSavedAt(new Date().toLocaleTimeString("ja-JP"));
    else {
      const data = await res.json();
      setError(data.error || "保存に失敗しました");
    }
    setSaving(false);
  };

  const fmt = (m: number) =>
    m >= 60 ? `${Math.floor(m / 60)}h${m % 60 > 0 ? `${m % 60}m` : ""}` : m > 0 ? `${m}m` : "-";

  const BAR_H = 140;

  return (
    <div>
      {/* 科目タブ */}
      <div className="flex flex-wrap gap-1 mb-3">
        <button
          onClick={() => setActiveSubject(null)}
          className={`px-2.5 py-1 text-xs rounded-full transition-colors ${
            activeSubject === null
              ? "bg-primary text-white"
              : "bg-surface text-charcoal hover:bg-gray-200"
          }`}
        >
          合計
        </button>
        {examSubjects.map((s) => (
          <button
            key={s}
            onClick={() => setActiveSubject(s)}
            className={`px-2.5 py-1 text-xs rounded-full transition-colors ${
              activeSubject === s
                ? "text-white"
                : "bg-surface text-charcoal hover:bg-gray-200"
            }`}
            style={activeSubject === s ? { backgroundColor: subjectColorMap.get(s) } : undefined}
          >
            {s}
          </button>
        ))}
      </div>

      {activeSubject && (
        <p className="text-[10px] text-dark/50 mb-2">
          バーをドラッグして時間を調整 / ＋−ボタンで10分ずつ調整
        </p>
      )}

      {/* 棒グラフ */}
      <div className="grid grid-cols-7 gap-2 mb-1">
        {WEEKDAY_LABELS.map((_, w) => {
          const isToday = w === todayIdx;
          const isDragging = dragValue?.w === w;
          const slots = schedule[w] || [];
          const total = dayTotal(w);

          if (activeSubject) {
            // 科目モード: 単色バー + ドラッグ
            const mins = isDragging ? dragValue.minutes : getSubjectMinutes(w, activeSubject);
            const barAreaH = BAR_H - 20; // ラベル分を引いた描画領域
            const barPx = maxVal > 0 ? Math.max(mins > 0 ? 4 : 1, (mins / maxVal) * barAreaH) : 1;
            const color = subjectColorMap.get(activeSubject) || "#94a3b8";
            return (
              <div key={`bar-${w}`} className="flex flex-col items-center" style={{ height: BAR_H }}>
                <div
                  className="flex-1 w-full flex items-end justify-center relative"
                  data-bar
                >
                  <div
                    className={`w-10 rounded-t relative ${isDragging ? "" : "transition-[height] duration-300"} ${isToday ? "ring-2 ring-accent" : ""}`}
                    style={{ height: barPx, backgroundColor: color }}
                  >
                    {/* ドラッグハンドル */}
                    <div
                      className="absolute -top-3 left-0 right-0 h-6 cursor-ns-resize flex items-center justify-center"
                      onMouseDown={(e) => handleDragStart(w, e)}
                      onTouchStart={(e) => handleDragStart(w, e)}
                    >
                      <div className="w-6 h-1.5 bg-white/90 rounded-full shadow border border-gray-300" />
                    </div>
                  </div>
                  {/* ドラッグ中の値表示 */}
                  {isDragging && (
                    <div
                      className="absolute left-1/2 -translate-x-1/2 bg-dark text-white text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap pointer-events-none z-10"
                      style={{ bottom: barPx + 8 }}
                    >
                      {fmt(dragValue.minutes)}
                    </div>
                  )}
                </div>
                <div className="text-[10px] text-dark/60 mt-1 h-4">{fmt(mins)}</div>
              </div>
            );
          }

          // 合計モード: 積み上げ棒
          const barAreaH = BAR_H - 20;
          const barPx = maxVal > 0 ? Math.max(total > 0 ? 4 : 1, (total / maxVal) * barAreaH) : 1;
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
                  className={`w-10 rounded-t overflow-hidden transition-all duration-300 ${isToday ? "ring-2 ring-accent" : ""}`}
                  style={{ height: barPx }}
                >
                  <div className="w-full h-full flex flex-col-reverse">
                    {total > 0 ? slots.map((sl, i) => {
                      const segPct = (sl.minutes / total) * 100;
                      const color = subjectColorMap.get(sl.subject) || "#94a3b8";
                      return <div key={i} style={{ height: `${segPct}%`, backgroundColor: color }} />;
                    }) : (
                      <div className="w-full h-full bg-gray-200" />
                    )}
                  </div>
                </div>
              </div>
              <div className="text-[10px] text-dark/60 mt-1 h-4">{fmt(total)}</div>
            </div>
          );
        })}
      </div>

      {/* +/- ボタン（科目モード時） */}
      {activeSubject && (
        <div className="grid grid-cols-7 gap-2 mb-1">
          {WEEKDAY_LABELS.map((_, w) => (
            <div key={`pm-${w}`} className="flex justify-center gap-1">
              <button
                onClick={() => stepDown(w)}
                className="w-6 h-6 rounded bg-surface text-dark/60 text-xs hover:bg-gray-200 flex items-center justify-center"
              >
                −
              </button>
              <button
                onClick={() => stepUp(w)}
                className="w-6 h-6 rounded bg-surface text-dark/60 text-xs hover:bg-gray-200 flex items-center justify-center"
              >
                ＋
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 曜日ラベル */}
      <div className="grid grid-cols-7 gap-2 mb-3">
        {WEEKDAY_LABELS.map((label, w) => {
          const isToday = w === todayIdx;
          return (
            <div
              key={w}
              className={`text-center text-xs ${
                !activeSubject ? "cursor-pointer hover:text-primary" : ""
              } ${w === 0 ? "text-red-500" : w === 6 ? "text-blue-500" : "text-dark/70"} ${
                isToday ? "font-bold" : ""
              }`}
              onClick={() => !activeSubject && setEditingDay(w)}
            >
              {label}{isToday && " (今日)"}
            </div>
          );
        })}
      </div>

      {/* 凡例（合計モード時） */}
      {!activeSubject && (
        <div className="flex flex-wrap gap-x-3 gap-y-1 mb-3">
          {examSubjects.map((s) => (
            <button
              key={s}
              className="flex items-center gap-1 text-[10px] text-dark/60 hover:text-dark"
              onClick={() => setActiveSubject(s)}
            >
              <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: subjectColorMap.get(s) }} />
              {s}
            </button>
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

      {/* 合計モード: 曜日編集モーダル */}
      {editingDay !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setEditingDay(null)}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-semibold text-dark">{WEEKDAY_LABELS[editingDay]}曜日の学習科目</h3>
              <button onClick={() => setEditingDay(null)} className="text-dark/60 hover:text-dark">✕</button>
            </div>
            {(schedule[editingDay] || []).length === 0 ? (
              <p className="text-sm text-dark/40 mb-3">科目が未設定です</p>
            ) : (
              <div className="space-y-2 mb-3">
                {(schedule[editingDay] || []).map((slot, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: subjectColorMap.get(slot.subject) || "#94a3b8" }} />
                    <select value={slot.subject} onChange={(e) => updateSlot(editingDay, i, "subject", e.target.value)} className="text-sm border border-gray-300 rounded px-2 py-1 bg-white flex-1 min-w-0">
                      {examSubjects.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <div className="flex items-center gap-0.5">
                      <input
                        type="number"
                        min={0}
                        max={24}
                        value={Math.floor(slot.minutes / 60)}
                        onChange={(e) => {
                          const h = Math.max(0, Math.min(24, parseInt(e.target.value) || 0));
                          const m = slot.minutes % 60;
                          updateSlot(editingDay, i, "minutes", h * 60 + m);
                        }}
                        className="text-sm border border-gray-300 rounded px-1.5 py-1 bg-white w-12 text-center"
                      />
                      <span className="text-xs text-dark/50">h</span>
                      <select
                        value={slot.minutes % 60}
                        onChange={(e) => {
                          const h = Math.floor(slot.minutes / 60);
                          updateSlot(editingDay, i, "minutes", h * 60 + Number(e.target.value));
                        }}
                        className="text-sm border border-gray-300 rounded px-1 py-1 bg-white w-14"
                      >
                        {[0, 10, 20, 30, 40, 50].map((m) => <option key={m} value={m}>{m}</option>)}
                      </select>
                      <span className="text-xs text-dark/50">m</span>
                    </div>
                    <button onClick={() => removeSlot(editingDay, i)} className="text-red-400 hover:text-red-600 text-sm">✕</button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center justify-between">
              <button onClick={() => addSlot(editingDay)} disabled={examSubjects.length === 0} className="text-sm text-primary hover:underline disabled:opacity-50">+ 科目を追加</button>
              <div className="flex gap-2">
                {(schedule[editingDay] || []).length > 0 && (
                  <button onClick={() => copyToAll(editingDay)} className="text-xs text-dark/50 hover:text-primary border border-gray-200 px-2 py-1 rounded">全曜日に適用</button>
                )}
                <button onClick={() => setEditingDay(null)} className="bg-primary text-white px-3 py-1 rounded text-sm hover:bg-primary-dark">閉じる</button>
              </div>
            </div>
            <div className="mt-3 text-xs text-dark/50 text-right">合計: {fmt(dayTotal(editingDay))}</div>
          </div>
        </div>
      )}
    </div>
  );
}
