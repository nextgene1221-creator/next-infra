"use client";

import { useEffect, useState } from "react";
import { SUBJECTS } from "@/lib/types";

const TASK_TYPES = ["通常", "要引き継ぎ", "面談"] as const;

type StudentOption = { id: string; name: string };

type Routine = {
  id: string;
  studentId: string | null;
  subject: string;
  title: string;
  description: string;
  type: string;
  student?: { user: { name: string } } | null;
};

export default function RoutineTaskManager({
  teacherId,
  initialRoutines,
}: {
  teacherId: string;
  initialRoutines: Routine[];
}) {
  const [routines, setRoutines] = useState<Routine[]>(initialRoutines);
  const [students, setStudents] = useState<StudentOption[]>([]);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [studentId, setStudentId] = useState("");
  const [subject, setSubject] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("通常");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/students-list")
      .then((r) => r.json())
      .then(setStudents);
  }, []);

  const resetForm = () => {
    setStudentId("");
    setSubject("");
    setTitle("");
    setDescription("");
    setType("通常");
    setEditingId(null);
    setShowForm(false);
  };

  const openEdit = (r: Routine) => {
    setStudentId(r.studentId || "");
    setSubject(r.subject);
    setTitle(r.title);
    setDescription(r.description);
    setType(r.type);
    setEditingId(r.id);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const body = { teacherId, studentId: studentId || null, subject, title, description, type };
    const url = editingId ? `/api/routine-tasks/${editingId}` : "/api/routine-tasks";
    const method = editingId ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      // 再取得
      const list = await fetch(`/api/routine-tasks?teacherId=${teacherId}`).then((r) => r.json());
      setRoutines(list);
      resetForm();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("このルーティンタスクを削除しますか？")) return;
    const res = await fetch(`/api/routine-tasks/${id}`, { method: "DELETE" });
    if (res.ok) {
      setRoutines((prev) => prev.filter((r) => r.id !== id));
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">ルーティンタスク</h2>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-primary text-white px-3 py-1.5 rounded-md text-sm hover:bg-primary-dark"
          >
            ルーティンを追加
          </button>
        )}
      </div>
      <p className="text-xs text-dark/60 mb-3">
        ※ 出勤打刻時に、これらのルーティンが当日のタスクとして自動生成されます（期限: 当日23:59）
      </p>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-surface rounded-lg p-4 mb-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-charcoal">タスク名</label>
              <input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例: 教室清掃"
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal">種別</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white"
              >
                {TASK_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal">科目</label>
              <select
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white"
              >
                <option value="">選択してください</option>
                {SUBJECTS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal">生徒（任意）</label>
              <select
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white"
              >
                <option value="">なし</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-charcoal">説明</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
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
              className="bg-white text-charcoal px-4 py-2 rounded-md text-sm border border-gray-300 hover:bg-gray-100"
            >
              キャンセル
            </button>
          </div>
        </form>
      )}

      {routines.length === 0 && !showForm ? (
        <p className="text-dark/60 text-sm">ルーティンタスクが設定されていません</p>
      ) : (
        <div className="space-y-2">
          {routines.map((r) => (
            <div
              key={r.id}
              className="border border-gray-200 rounded-md p-3 bg-white flex justify-between items-start"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary-light text-primary font-medium">
                    {r.type}
                  </span>
                  <span className="text-xs text-dark/60">[{r.subject}]</span>
                  <span className="text-sm font-medium text-dark">{r.title}</span>
                </div>
                {r.student && (
                  <p className="text-xs text-dark/60 mt-1">対象生徒: {r.student.user.name}</p>
                )}
                {r.description && (
                  <p className="text-xs text-dark/50 mt-1">{r.description}</p>
                )}
              </div>
              <div className="flex gap-3 items-center ml-4">
                <button onClick={() => openEdit(r)} className="text-xs text-primary hover:underline">
                  編集
                </button>
                <button onClick={() => handleDelete(r.id)} className="text-xs text-red-500 hover:underline">
                  削除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
