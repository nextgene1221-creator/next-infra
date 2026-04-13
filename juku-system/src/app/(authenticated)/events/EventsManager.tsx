"use client";

import { useState } from "react";

export const EVENT_TYPES = ["試験", "文化祭", "体育祭", "修学旅行", "その他"] as const;

type School = { id: string; name: string };
type Event = {
  id: string;
  schoolId: string;
  schoolName: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string | null;
  eventType: string;
};

export default function EventsManager({
  initialSchools,
  initialEvents,
}: {
  initialSchools: School[];
  initialEvents: Event[];
}) {
  const [schools, setSchools] = useState<School[]>(initialSchools);
  const [events, setEvents] = useState<Event[]>(initialEvents);

  // 学校
  const [newSchoolName, setNewSchoolName] = useState("");
  const [schoolError, setSchoolError] = useState("");

  // イベント
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [schoolId, setSchoolId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [eventType, setEventType] = useState<string>("その他");
  const [saving, setSaving] = useState(false);
  const [filterSchoolId, setFilterSchoolId] = useState("");

  const addSchool = async () => {
    if (!newSchoolName.trim()) return;
    setSchoolError("");
    const res = await fetch("/api/schools", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newSchoolName.trim() }),
    });
    if (res.ok) {
      const s = await res.json();
      setSchools((prev) => [...prev, s].sort((a, b) => a.name.localeCompare(b.name)));
      setNewSchoolName("");
    } else {
      const data = await res.json();
      setSchoolError(data.error || "追加に失敗しました");
    }
  };

  const deleteSchool = async (id: string) => {
    if (!confirm("この学校を削除しますか？\n関連するイベントも全て削除されます")) return;
    const res = await fetch(`/api/schools/${id}`, { method: "DELETE" });
    if (res.ok) {
      setSchools((prev) => prev.filter((s) => s.id !== id));
      setEvents((prev) => prev.filter((e) => e.schoolId !== id));
    }
  };

  const resetForm = () => {
    setSchoolId(""); setTitle(""); setDescription("");
    setStartDate(""); setEndDate(""); setEventType("その他");
    setEditingId(null); setShowForm(false);
  };
  const openNew = () => {
    resetForm();
    setStartDate(new Date().toISOString().split("T")[0]);
    if (schools[0]) setSchoolId(schools[0].id);
    setShowForm(true);
  };
  const openEdit = (e: Event) => {
    setSchoolId(e.schoolId);
    setTitle(e.title);
    setDescription(e.description);
    setStartDate(e.startDate.split("T")[0]);
    setEndDate(e.endDate ? e.endDate.split("T")[0] : "");
    setEventType(e.eventType);
    setEditingId(e.id);
    setShowForm(true);
  };
  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setSaving(true);
    const body = { schoolId, title, description, startDate, endDate: endDate || null, eventType };
    const url = editingId ? `/api/school-events/${editingId}` : "/api/school-events";
    const method = editingId ? "PUT" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) {
      const data = await res.json();
      const norm: Event = {
        id: data.id,
        schoolId: data.schoolId,
        schoolName: data.school.name,
        title: data.title,
        description: data.description,
        startDate: new Date(data.startDate).toISOString(),
        endDate: data.endDate ? new Date(data.endDate).toISOString() : null,
        eventType: data.eventType,
      };
      if (editingId) {
        setEvents((prev) => prev.map((x) => x.id === editingId ? norm : x));
      } else {
        setEvents((prev) => [...prev, norm].sort((a, b) => a.startDate.localeCompare(b.startDate)));
      }
      resetForm();
    }
    setSaving(false);
  };
  const deleteEvent = async (id: string) => {
    if (!confirm("このイベントを削除しますか？")) return;
    const res = await fetch(`/api/school-events/${id}`, { method: "DELETE" });
    if (res.ok) setEvents((prev) => prev.filter((e) => e.id !== id));
  };

  const inputCls = "mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm";

  const filtered = filterSchoolId ? events.filter((e) => e.schoolId === filterSchoolId) : events;

  return (
    <div className="space-y-6">
      {/* 学校マスタ */}
      <section className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">学校マスタ</h2>
        <div className="flex gap-2 mb-3">
          <input
            value={newSchoolName}
            onChange={(e) => setNewSchoolName(e.target.value)}
            placeholder="学校名を入力"
            className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
          <button onClick={addSchool} className="bg-primary text-white px-4 py-2 rounded-md text-sm hover:bg-primary-dark">追加</button>
        </div>
        {schoolError && <p className="text-sm text-red-600 mb-2">{schoolError}</p>}
        {schools.length === 0 ? (
          <p className="text-dark/60 text-sm">学校が登録されていません</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {schools.map((s) => (
              <li key={s.id} className="flex items-center gap-1 bg-surface rounded-full px-3 py-1 text-sm">
                {s.name}
                <button onClick={() => deleteSchool(s.id)} className="text-xs text-red-500 hover:underline ml-1">×</button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* イベント */}
      <section className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">イベント一覧</h2>
          <div className="flex gap-2 items-center">
            <select
              value={filterSchoolId}
              onChange={(e) => setFilterSchoolId(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
            >
              <option value="">全学校</option>
              {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            {!showForm && (
              <button onClick={openNew} disabled={schools.length === 0} className="bg-primary text-white px-3 py-1.5 rounded-md text-sm hover:bg-primary-dark disabled:opacity-50">
                イベント追加
              </button>
            )}
          </div>
        </div>

        {showForm && (
          <form onSubmit={submit} className="bg-surface rounded-lg p-4 mb-4 space-y-3">
            <h3 className="text-sm font-semibold">{editingId ? "イベントを編集" : "イベントを追加"}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-charcoal">学校</label>
                <select required value={schoolId} onChange={(e) => setSchoolId(e.target.value)} className={inputCls}>
                  <option value="">選択してください</option>
                  {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal">イベント種別</label>
                <select value={eventType} onChange={(e) => setEventType(e.target.value)} className={inputCls}>
                  {EVENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-charcoal">タイトル</label>
                <input required value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal">開始日</label>
                <input type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal">終了日（任意・単日ならなし）</label>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputCls} />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-charcoal">説明</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={inputCls} />
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={saving} className="bg-primary text-white px-4 py-2 rounded-md text-sm hover:bg-primary-dark disabled:opacity-50">
                {saving ? "保存中..." : editingId ? "更新" : "追加"}
              </button>
              <button type="button" onClick={resetForm} className="bg-white text-charcoal px-4 py-2 rounded-md text-sm border border-gray-300 hover:bg-gray-100">キャンセル</button>
            </div>
          </form>
        )}

        {filtered.length === 0 ? (
          <p className="text-dark/60 text-sm">イベントがありません</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-surface">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-dark/60">日程</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-dark/60">学校</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-dark/60">種別</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-dark/60">タイトル / 説明</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-dark/60">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filtered.map((e) => {
                  const sd = new Date(e.startDate);
                  const ed = e.endDate ? new Date(e.endDate) : null;
                  return (
                    <tr key={e.id}>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {sd.toLocaleDateString("ja-JP")}
                        {ed && <> 〜 {ed.toLocaleDateString("ja-JP")}</>}
                      </td>
                      <td className="px-3 py-2">{e.schoolName}</td>
                      <td className="px-3 py-2">{e.eventType}</td>
                      <td className="px-3 py-2">
                        <div className="font-medium">{e.title}</div>
                        {e.description && <div className="text-xs text-dark/60 whitespace-pre-wrap">{e.description}</div>}
                      </td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        <button onClick={() => openEdit(e)} className="text-xs text-primary hover:underline">編集</button>
                        <button onClick={() => deleteEvent(e.id)} className="ml-2 text-xs text-red-500 hover:underline">削除</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
