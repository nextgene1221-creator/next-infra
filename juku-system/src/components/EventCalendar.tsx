"use client";

import { useMemo, useState } from "react";

type School = { id: string; name: string };
type Event = {
  id: string;
  schoolId: string;
  schoolName: string;
  title: string;
  startDate: string;
  endDate: string | null;
  eventType: string;
};

const MS_DAY = 24 * 60 * 60 * 1000;

const SCHOOL_COLORS = [
  "bg-blue-100 text-blue-800",
  "bg-emerald-100 text-emerald-800",
  "bg-amber-100 text-amber-800",
  "bg-rose-100 text-rose-800",
  "bg-violet-100 text-violet-800",
  "bg-cyan-100 text-cyan-800",
  "bg-fuchsia-100 text-fuchsia-800",
  "bg-lime-100 text-lime-800",
];

function colorForSchool(schoolId: string, schools: School[]) {
  const idx = schools.findIndex((s) => s.id === schoolId);
  return SCHOOL_COLORS[(idx >= 0 ? idx : 0) % SCHOOL_COLORS.length];
}

function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function startOfCalendar(d: Date) {
  const s = startOfMonth(d);
  const day = s.getDay();
  s.setDate(s.getDate() - day);
  return s;
}
function eventCoversDate(e: Event, day: Date) {
  const d = day.getTime();
  const s = new Date(e.startDate).setHours(0, 0, 0, 0);
  const ee = e.endDate ? new Date(e.endDate).setHours(23, 59, 59, 999) : new Date(e.startDate).setHours(23, 59, 59, 999);
  return d >= s && d <= ee;
}

export default function EventCalendar({
  schools,
  events,
}: {
  schools: School[];
  events: Event[];
}) {
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const [selectedSchoolIds, setSelectedSchoolIds] = useState<Set<string>>(() => new Set(schools.map((s) => s.id)));

  const filtered = useMemo(
    () => events.filter((e) => selectedSchoolIds.has(e.schoolId)),
    [events, selectedSchoolIds]
  );

  const calStart = startOfCalendar(cursor);
  // 6週分
  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    days.push(new Date(calStart.getTime() + i * MS_DAY));
  }

  const upcoming = useMemo(() => {
    const now = Date.now();
    return filtered
      .filter((e) => {
        const end = e.endDate ? new Date(e.endDate).getTime() : new Date(e.startDate).getTime();
        return end >= now;
      })
      .sort((a, b) => a.startDate.localeCompare(b.startDate))
      .slice(0, 10);
  }, [filtered]);

  const toggleSchool = (id: string) => {
    setSelectedSchoolIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const allOn = selectedSchoolIds.size === schools.length;
  const toggleAll = () => {
    setSelectedSchoolIds(allOn ? new Set() : new Set(schools.map((s) => s.id)));
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-semibold">学校イベントカレンダー</h2>
        <div className="flex items-center gap-2 text-sm">
          <button
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
            className="px-2 py-1 rounded bg-surface hover:bg-gray-200"
          >
            ←
          </button>
          <span className="font-medium min-w-[6rem] text-center">
            {cursor.getFullYear()}年{cursor.getMonth() + 1}月
          </span>
          <button
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
            className="px-2 py-1 rounded bg-surface hover:bg-gray-200"
          >
            →
          </button>
          <button
            onClick={() => setCursor(startOfMonth(new Date()))}
            className="px-2 py-1 rounded bg-surface hover:bg-gray-200 text-xs"
          >
            今月
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px] gap-4">
        {/* カレンダー + 直近リスト */}
        <div className="space-y-4 min-w-0">
          <div className="overflow-x-auto">
            <div className="grid grid-cols-7 text-xs font-medium text-dark/60 mb-1 min-w-[560px]">
              {["日", "月", "火", "水", "木", "金", "土"].map((d, i) => (
                <div key={d} className={`px-2 py-1 ${i === 0 ? "text-red-500" : i === 6 ? "text-blue-500" : ""}`}>{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-px bg-gray-200 border border-gray-200 rounded overflow-hidden min-w-[560px]">
              {days.map((day) => {
                const inMonth = day.getMonth() === cursor.getMonth();
                const isToday = new Date().toDateString() === day.toDateString();
                const dayEvents = filtered.filter((e) => eventCoversDate(e, day));
                return (
                  <div
                    key={day.toISOString()}
                    className={`min-h-[80px] p-1 ${inMonth ? "bg-white" : "bg-gray-50"} ${isToday ? "ring-2 ring-primary" : ""}`}
                  >
                    <div className={`text-xs mb-1 ${inMonth ? "text-dark" : "text-dark/30"} ${day.getDay() === 0 ? "text-red-500" : day.getDay() === 6 ? "text-blue-500" : ""}`}>
                      {day.getDate()}
                    </div>
                    <div className="space-y-0.5">
                      {dayEvents.slice(0, 3).map((e) => (
                        <div
                          key={e.id}
                          className={`text-[10px] px-1 py-0.5 rounded truncate ${colorForSchool(e.schoolId, schools)}`}
                          title={`[${e.schoolName}] ${e.title}${e.endDate ? ` (〜${new Date(e.endDate).toLocaleDateString("ja-JP")})` : ""}`}
                        >
                          {e.schoolName.slice(0, 4)}: {e.title}
                        </div>
                      ))}
                      {dayEvents.length > 3 && (
                        <div className="text-[10px] text-dark/60">+{dayEvents.length - 3}件</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 直近イベントリスト */}
          <div>
            <h3 className="text-sm font-semibold mb-2">直近のイベント</h3>
            {upcoming.length === 0 ? (
              <p className="text-xs text-dark/60">予定がありません</p>
            ) : (
              <ul className="space-y-1">
                {upcoming.map((e) => (
                  <li key={e.id} className="text-xs flex items-center gap-2">
                    <span className={`inline-block w-2 h-2 rounded-full ${colorForSchool(e.schoolId, schools).split(" ")[0]}`} />
                    <span className="text-dark/70 w-24 shrink-0">
                      {new Date(e.startDate).toLocaleDateString("ja-JP")}
                      {e.endDate && <>〜{new Date(e.endDate).toLocaleDateString("ja-JP").slice(5)}</>}
                    </span>
                    <span className="font-medium">[{e.schoolName}]</span>
                    <span className="text-dark/60">({e.eventType})</span>
                    <span className="truncate">{e.title}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* フィルタ */}
        <aside className="border border-gray-200 rounded-md p-3">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-semibold">学校フィルタ</h3>
            <button onClick={toggleAll} className="text-xs text-primary hover:underline">
              {allOn ? "全解除" : "全選択"}
            </button>
          </div>
          {schools.length === 0 ? (
            <p className="text-xs text-dark/60">学校が未登録です</p>
          ) : (
            <ul className="space-y-1 max-h-80 overflow-y-auto">
              {schools.map((s) => (
                <li key={s.id}>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedSchoolIds.has(s.id)}
                      onChange={() => toggleSchool(s.id)}
                    />
                    <span className={`inline-block px-1.5 rounded text-xs ${colorForSchool(s.id, schools)}`}>■</span>
                    <span className="truncate">{s.name}</span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>

    </div>
  );
}
