"use client";

import { useState } from "react";
import { SUBJECTS } from "@/lib/types";

export type ClassDayItem = {
  id: string;
  date: string;
  subject: string;
  teacherId: string | null;
  teacherName: string | null;
  startTime: string;
  endTime: string;
  note: string;
};

type RawClassDay = {
  id: string;
  date: string;
  subject: string;
  teacherId: string | null;
  startTime: string;
  endTime: string;
  note: string;
  teacher?: { user: { name: string } } | null;
};

function toItem(d: RawClassDay): ClassDayItem {
  return {
    id: d.id,
    date: d.date,
    subject: d.subject,
    teacherId: d.teacherId,
    teacherName: d.teacher?.user?.name ?? null,
    startTime: d.startTime,
    endTime: d.endTime,
    note: d.note,
  };
}

const ymd = (iso: string) => iso.split("T")[0];

export default function ClassDayEditor({
  studentId,
  initialClassDays,
  teachers,
}: {
  studentId: string;
  initialClassDays: ClassDayItem[];
  teachers: { id: string; name: string }[];
}) {
  const [days, setDays] = useState<ClassDayItem[]>(
    [...initialClassDays].sort((a, b) => a.date.localeCompare(b.date))
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // 追加フォーム
  const [date, setDate] = useState("");
  const [subject, setSubject] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [note, setNote] = useState("");

  const sortDays = (arr: ClassDayItem[]) =>
    [...arr].sort((a, b) => a.date.localeCompare(b.date));

  const resetForm = () => {
    setDate("");
    setSubject("");
    setTeacherId("");
    setStartTime("");
    setEndTime("");
    setNote("");
  };

  const add = async () => {
    if (!date) {
      setError("日付を入力してください");
      return;
    }
    setBusy(true);
    setError("");
    const res = await fetch("/api/class-days", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId, date, subject, teacherId, startTime, endTime, note }),
    });
    if (res.ok) {
      const created = (await res.json()) as RawClassDay;
      setDays((prev) => sortDays([...prev, toItem(created)]));
      resetForm();
    } else {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "追加に失敗しました");
    }
    setBusy(false);
  };

  const remove = async (id: string) => {
    if (!confirm("この授業日を削除しますか？")) return;
    const res = await fetch(`/api/class-days/${id}`, { method: "DELETE" });
    if (res.ok) setDays((prev) => prev.filter((d) => d.id !== id));
  };

  // 前回（最新の授業日を含む7日間）の授業日を +7日でコピー
  const copyPrevWeek = async () => {
    if (days.length === 0) return;
    const maxDate = days.reduce((m, d) => (d.date > m ? d.date : m), days[0].date);
    const maxMs = new Date(ymd(maxDate)).getTime();
    const weekStartMs = maxMs - 6 * 24 * 60 * 60 * 1000;
    const sources = days.filter((d) => {
      const t = new Date(ymd(d.date)).getTime();
      return t >= weekStartMs && t <= maxMs;
    });
    if (sources.length === 0) return;
    setBusy(true);
    setError("");
    const created: ClassDayItem[] = [];
    for (const s of sources) {
      const nextDate = new Date(new Date(ymd(s.date)).getTime() + 7 * 24 * 60 * 60 * 1000);
      const res = await fetch("/api/class-days", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          date: ymd(nextDate.toISOString()),
          subject: s.subject,
          teacherId: s.teacherId || "",
          startTime: s.startTime,
          endTime: s.endTime,
          note: s.note,
        }),
      });
      if (res.ok) created.push(toItem((await res.json()) as RawClassDay));
    }
    setDays((prev) => sortDays([...prev, ...created]));
    setBusy(false);
  };

  const weekdayLabel = (iso: string) =>
    ["日", "月", "火", "水", "木", "金", "土"][new Date(ymd(iso)).getDay()];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-dark">授業日</h3>
        {days.length > 0 && (
          <button
            onClick={copyPrevWeek}
            disabled={busy}
            className="text-xs text-primary hover:underline disabled:opacity-50"
          >
            前回分を翌週にコピー
          </button>
        )}
      </div>

      {/* 一覧 */}
      {days.length === 0 ? (
        <p className="text-xs text-dark/50">授業日が登録されていません</p>
      ) : (
        <ul className="space-y-1">
          {days.map((d) => (
            <li
              key={d.id}
              className="flex items-center gap-2 text-sm bg-surface rounded px-2 py-1.5"
            >
              <span className="font-medium whitespace-nowrap">
                {new Date(ymd(d.date)).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" })}
                （{weekdayLabel(d.date)}）
              </span>
              {(d.startTime || d.endTime) && (
                <span className="text-xs text-dark/60 whitespace-nowrap">
                  {d.startTime}{d.endTime ? `〜${d.endTime}` : ""}
                </span>
              )}
              {d.subject && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-primary-light text-primary">
                  {d.subject}
                </span>
              )}
              {d.teacherName && (
                <span className="text-xs text-dark/60">{d.teacherName}</span>
              )}
              {d.note && <span className="text-xs text-dark/50 truncate">{d.note}</span>}
              <button
                onClick={() => remove(d.id)}
                className="ml-auto text-xs text-red-500 hover:underline shrink-0"
              >
                削除
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* 追加フォーム */}
      <div className="border-t border-gray-100 pt-3 space-y-2">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          <div>
            <label className="block text-xs text-dark/60 mb-0.5">日付</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full"
            />
          </div>
          <div>
            <label className="block text-xs text-dark/60 mb-0.5">科目（任意）</label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full bg-white"
            >
              <option value="">未指定</option>
              {SUBJECTS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-dark/60 mb-0.5">担当講師（任意）</label>
            <select
              value={teacherId}
              onChange={(e) => setTeacherId(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full bg-white"
            >
              <option value="">未指定</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-dark/60 mb-0.5">開始（任意）</label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full"
            />
          </div>
          <div>
            <label className="block text-xs text-dark/60 mb-0.5">終了（任意）</label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full"
            />
          </div>
          <div className="col-span-2 md:col-span-1">
            <label className="block text-xs text-dark/60 mb-0.5">メモ（任意）</label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1.5 text-sm w-full"
            />
          </div>
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <button
          onClick={add}
          disabled={busy || !date}
          className="bg-primary text-white px-3 py-1.5 rounded text-sm hover:bg-primary-dark disabled:opacity-50"
        >
          授業日を追加
        </button>
      </div>
    </div>
  );
}
