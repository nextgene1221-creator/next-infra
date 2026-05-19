"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import StudentSearchSelect from "./StudentSearchSelect";

type TeacherLite = {
  id: string;
  user: { id: string; name: string };
};

type Assignment = {
  id: string;
  teacher: TeacherLite;
};

type TeacherListItem = { id: string; name: string };

export default function TeacherAssignmentManager({
  studentId,
  initialAssignments,
  canEdit,
}: {
  studentId: string;
  initialAssignments: Assignment[];
  canEdit: boolean;
}) {
  const [assignments, setAssignments] = useState<Assignment[]>(initialAssignments);
  const [allTeachers, setAllTeachers] = useState<TeacherListItem[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!canEdit) return;
    fetch("/api/teachers-list")
      .then((r) => r.json())
      .then((data) => setAllTeachers(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [canEdit]);

  const assignedIds = new Set(assignments.map((a) => a.teacher.id));
  const available = allTeachers.filter((t) => !assignedIds.has(t.id));

  const add = async () => {
    if (!selectedId) return;
    setBusy(true);
    setError("");
    const res = await fetch(`/api/students/${studentId}/assignments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teacherId: selectedId }),
    });
    if (res.ok) {
      const created = (await res.json()) as Assignment;
      setAssignments((prev) => [created, ...prev]);
      setSelectedId("");
    } else {
      const data = await res.json();
      setError(data.error || "追加に失敗しました");
    }
    setBusy(false);
  };

  const remove = async (teacherId: string) => {
    if (!confirm("担当を解除しますか？")) return;
    setBusy(true);
    const res = await fetch(
      `/api/students/${studentId}/assignments?teacherId=${teacherId}`,
      { method: "DELETE" },
    );
    if (res.ok) {
      setAssignments((prev) => prev.filter((a) => a.teacher.id !== teacherId));
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "解除に失敗しました");
    }
    setBusy(false);
  };

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">担当講師</h2>

      {canEdit && (
        <div className="flex gap-2 mb-4">
          <div className="flex-1">
            {/* 既存の汎用検索プルダウンを流用（{id, name, hint} 形式を渡せばよい） */}
            <StudentSearchSelect
              students={available.map((t) => ({ id: t.id, name: t.name }))}
              value={selectedId}
              onChange={setSelectedId}
              placeholder="講師名で検索して担当追加"
            />
          </div>
          <button
            type="button"
            onClick={add}
            disabled={!selectedId || busy}
            className="bg-primary text-white px-4 py-2 rounded-md text-sm hover:bg-primary-dark disabled:opacity-50"
          >
            追加
          </button>
        </div>
      )}
      {error && <div className="text-sm text-red-600 mb-2">{error}</div>}

      {assignments.length === 0 ? (
        <p className="text-dark/60 text-sm">担当講師がいません</p>
      ) : (
        <ul className="divide-y divide-gray-200">
          {assignments.map((a) => (
            <li key={a.id} className="flex justify-between items-center py-2">
              <Link href={`/teachers/${a.teacher.id}`} className="text-sm hover:underline">
                {a.teacher.user.name}
              </Link>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => remove(a.teacher.id)}
                  disabled={busy}
                  className="text-xs text-red-600 hover:underline"
                >
                  解除
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
