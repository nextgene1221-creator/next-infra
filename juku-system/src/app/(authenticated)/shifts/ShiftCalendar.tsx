"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ShiftTemplateForm from "@/components/ShiftTemplateForm";

const WEEKDAY_HEADERS = ["日", "月", "火", "水", "木", "金", "土"];

type Shift = {
  id: string;
  teacherId: string;
  date: string | Date;
  startTime: string;
  endTime: string;
  status: string;
  notes: string;
  teacher: { id: string; user: { name: string } };
};

type Teacher = { id: string; name: string };

type TemplateDay = { weekday: number; startTime: string; endTime: string };
type Template = {
  teacherId: string;
  teacherName: string;
  days: TemplateDay[];
};

export default function ShiftCalendar({
  year,
  month,
  initialShifts,
  teachers,
  templates,
  defaultEndTime,
  isAdmin,
}: {
  year: number;
  month: number;
  initialShifts: Shift[];
  teachers: Teacher[];
  templates: Template[];
  defaultEndTime: string;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [shifts, setShifts] = useState<Shift[]>(initialShifts);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [generating, setGenerating] = useState(false);

  // サーバーリフレッシュで initialShifts が更新された際に state を同期
  useEffect(() => {
    setShifts(initialShifts);
  }, [initialShifts]);

  // Group shifts by date (YYYY-MM-DD key)
  const shiftsByDate: Record<string, Shift[]> = {};
  for (const s of shifts) {
    const d = new Date(s.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    if (!shiftsByDate[key]) shiftsByDate[key] = [];
    shiftsByDate[key].push(s);
  }

  // Build calendar grid
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const daysInMonth = lastDay.getDate();
  const startWeekday = firstDay.getDay();

  const cells: (number | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const todayKey = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  })();

  const handleBulkGenerate = async () => {
    if (!confirm(`${year}年${month}月のテンプレートからシフトを一括生成しますか？\n（既存のシフトはスキップされます）`)) return;
    setGenerating(true);
    const monthStr = `${year}-${String(month).padStart(2, "0")}`;
    const res = await fetch("/api/shifts/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ month: monthStr }),
    });
    if (res.ok) {
      const data = await res.json();
      alert(`生成: ${data.created}件 / スキップ: ${data.skipped}件`);
      router.refresh();
    }
    setGenerating(false);
  };

  return (
    <div>
      {/* 上部ボタン */}
      {isAdmin && (
        <div className="flex justify-end gap-2 mb-4">
          <button
            onClick={() => setShowTemplatesModal(true)}
            className="bg-charcoal text-white px-4 py-2 rounded-md text-sm hover:bg-dark"
          >
            テンプレート設定
          </button>
          <button
            onClick={handleBulkGenerate}
            disabled={generating}
            className="bg-accent text-white px-4 py-2 rounded-md text-sm hover:opacity-90 disabled:opacity-50"
          >
            {generating ? "生成中..." : "一括生成"}
          </button>
        </div>
      )}

      {/* カレンダー */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <div className="min-w-[640px]">
        <div className="grid grid-cols-7 border-b border-gray-200">
          {WEEKDAY_HEADERS.map((label, idx) => (
            <div
              key={label}
              className={`px-2 py-2 text-center text-xs font-medium ${
                idx === 0
                  ? "text-red-500"
                  : idx === 6
                  ? "text-blue-500"
                  : "text-dark/60"
              }`}
            >
              {label}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-px bg-gray-200">
          {cells.map((day, idx) => {
            if (!day) {
              return <div key={idx} className="bg-surface min-h-24" />;
            }
            const dateKey = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const dayShifts = shiftsByDate[dateKey] || [];
            const isToday = dateKey === todayKey;
            const dow = (idx % 7);
            return (
              <div
                key={idx}
                onClick={() => isAdmin && setSelectedDate(dateKey)}
                className={`bg-white p-2 ${isAdmin ? "cursor-pointer hover:bg-surface" : ""} min-h-24`}
              >
                <div
                  className={`text-sm font-medium mb-1 ${
                    isToday
                      ? "text-primary font-bold"
                      : dow === 0
                      ? "text-red-500"
                      : dow === 6
                      ? "text-blue-500"
                      : "text-dark"
                  }`}
                >
                  {day}
                  {isToday && <span className="ml-1 text-xs">(今日)</span>}
                </div>
                <div className="space-y-1">
                  {dayShifts.map((s) => (
                    <div
                      key={s.id}
                      className={`text-xs px-1.5 py-0.5 rounded ${
                        s.status === "cancelled"
                          ? "bg-red-50 text-red-700 line-through"
                          : s.status === "confirmed"
                          ? "bg-green-50 text-green-800"
                          : "bg-primary-light text-primary"
                      }`}
                    >
                      <div className="font-medium">{s.startTime}-{s.endTime}</div>
                      <div className="truncate">{s.teacher.user.name}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        </div>
      </div>

      {/* 日付詳細モーダル */}
      {selectedDate && (
        <DayDetailModal
          dateKey={selectedDate}
          initialShifts={shiftsByDate[selectedDate] || []}
          teachers={teachers}
          onClose={() => setSelectedDate(null)}
          onChanged={() => {
            setSelectedDate(null);
            router.refresh();
          }}
        />
      )}

      {/* テンプレート設定モーダル */}
      {showTemplatesModal && (
        <TemplatesModal
          teachers={teachers}
          templates={templates}
          defaultEndTime={defaultEndTime}
          onClose={() => setShowTemplatesModal(false)}
          onChanged={() => router.refresh()}
        />
      )}
    </div>
  );
}

// ====================
// 日付詳細モーダル
// ====================
function DayDetailModal({
  dateKey,
  initialShifts,
  teachers,
  onClose,
  onChanged,
}: {
  dateKey: string;
  initialShifts: Shift[];
  teachers: Teacher[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const [shifts, setShifts] = useState(initialShifts);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [teacherId, setTeacherId] = useState("");
  const [startTime, setStartTime] = useState("14:00");
  const [endTime, setEndTime] = useState("20:00");
  const [status, setStatus] = useState("scheduled");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const dateLabel = new Date(dateKey).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });

  const resetForm = () => {
    setShowAddForm(false);
    setEditingId(null);
    setTeacherId("");
    setStartTime("14:00");
    setEndTime("20:00");
    setStatus("scheduled");
    setNotes("");
  };

  const openAdd = () => {
    resetForm();
    setShowAddForm(true);
  };

  const openEdit = (s: Shift) => {
    setEditingId(s.id);
    setTeacherId(s.teacherId);
    setStartTime(s.startTime);
    setEndTime(s.endTime);
    setStatus(s.status);
    setNotes(s.notes);
    setShowAddForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    if (editingId) {
      const res = await fetch(`/api/shifts/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teacherId, date: dateKey, startTime, endTime, status, notes }),
      });
      if (res.ok) {
        const updated = await res.json();
        const teacher = teachers.find((t) => t.id === teacherId);
        setShifts((prev) =>
          prev.map((s) =>
            s.id === editingId ? { ...s, ...updated, teacher: { id: teacherId, user: { name: teacher?.name || "" } } } : s
          )
        );
        resetForm();
        onChanged();
      }
    } else {
      const res = await fetch("/api/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teacherId, date: dateKey, startTime, endTime, status, notes }),
      });
      if (res.ok) {
        const created = await res.json();
        const teacher = teachers.find((t) => t.id === teacherId);
        setShifts((prev) => [
          ...prev,
          { ...created, teacher: { id: teacherId, user: { name: teacher?.name || "" } } },
        ]);
        resetForm();
        onChanged();
      }
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("このシフトを削除しますか？")) return;
    const res = await fetch(`/api/shifts/${id}`, { method: "DELETE" });
    if (res.ok) {
      setShifts((prev) => prev.filter((s) => s.id !== id));
      onChanged();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-dark">{dateLabel} のシフト</h3>
          <button onClick={onClose} className="text-dark/60 hover:text-dark">
            ✕
          </button>
        </div>

        {shifts.length === 0 ? (
          <p className="text-dark/60 text-sm mb-4">この日のシフトはありません</p>
        ) : (
          <div className="space-y-2 mb-4">
            {shifts.map((s) => (
              <div
                key={s.id}
                className="border border-gray-200 rounded-md p-3 flex justify-between items-center"
              >
                <div>
                  <div className="text-sm font-medium text-dark">
                    {s.startTime} - {s.endTime}
                  </div>
                  <div className="text-xs text-dark/60">
                    {s.teacher.user.name}
                    <span className="ml-2">
                      [{s.status === "scheduled" ? "予定" : s.status === "confirmed" ? "確定" : "キャンセル"}]
                    </span>
                  </div>
                  {s.notes && <p className="text-xs text-dark/50 mt-1">{s.notes}</p>}
                </div>
                <div className="flex gap-3">
                  <button onClick={() => openEdit(s)} className="text-xs text-primary hover:underline">
                    編集
                  </button>
                  <button onClick={() => handleDelete(s.id)} className="text-xs text-red-500 hover:underline">
                    削除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {!showAddForm ? (
          <button
            onClick={openAdd}
            className="bg-primary text-white px-4 py-2 rounded-md text-sm hover:bg-primary-dark"
          >
            シフトを追加
          </button>
        ) : (
          <form onSubmit={handleSubmit} className="bg-surface rounded-lg p-4 space-y-3">
            <h4 className="text-sm font-semibold text-dark">{editingId ? "シフト編集" : "シフト追加"}</h4>
            <div>
              <label className="block text-sm font-medium text-charcoal">講師</label>
              <select
                required
                value={teacherId}
                onChange={(e) => setTeacherId(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white"
              >
                <option value="">選択してください</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-charcoal">開始時刻</label>
                <input
                  type="time"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal">終了時刻</label>
                <input
                  type="time"
                  required
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal">ステータス</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white"
              >
                <option value="scheduled">予定</option>
                <option value="confirmed">確定</option>
                <option value="cancelled">キャンセル</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal">備考</label>
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="bg-primary text-white px-4 py-2 rounded-md text-sm hover:bg-primary-dark disabled:opacity-50"
              >
                {saving ? "保存中..." : editingId ? "更新" : "追加"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="bg-white text-charcoal px-4 py-2 rounded-md text-sm border border-gray-300"
              >
                キャンセル
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ====================
// テンプレート設定モーダル
// ====================
function TemplatesModal({
  teachers,
  templates,
  defaultEndTime,
  onClose,
  onChanged,
}: {
  teachers: Teacher[];
  templates: Template[];
  defaultEndTime: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-dark">週次シフトテンプレート設定</h3>
          <button onClick={onClose} className="text-dark/60 hover:text-dark">
            ✕
          </button>
        </div>

        <p className="text-xs text-dark/60 mb-4">
          各講師の週次テンプレートを曜日ごとに設定します。「一括生成」ボタンで月単位のシフトに展開できます。
        </p>

        <div className="space-y-4">
          {teachers.map((t) => {
            const tpl = templates.find((x) => x.teacherId === t.id);
            return (
              <div key={t.id} className="border border-gray-200 rounded-md p-4">
                <h4 className="text-sm font-semibold text-dark mb-3">{t.name}</h4>
                <ShiftTemplateForm
                  teacherId={t.id}
                  initialDays={tpl?.days ?? []}
                  defaultEndTime={defaultEndTime}
                  onSaved={onChanged}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
