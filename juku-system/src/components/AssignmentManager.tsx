"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type StudentLite = {
  id: string;
  schoolName: string;
  user: { id: string; name: string };
};

type Assignment = {
  id: string;
  student: StudentLite;
};

export default function AssignmentManager({
  teacherId,
  initialAssignments,
  canEdit,
}: {
  teacherId: string;
  initialAssignments: Assignment[];
  canEdit: boolean;
}) {
  const [assignments, setAssignments] = useState<Assignment[]>(initialAssignments);
  const [allStudents, setAllStudents] = useState<StudentLite[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!canEdit) return;
    fetch("/api/students")
      .then((r) => r.json())
      .then((data) => setAllStudents(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [canEdit]);

  const assignedIds = new Set(assignments.map((a) => a.student.id));
  const available = allStudents.filter((s) => !assignedIds.has(s.id));

  const add = async () => {
    if (!selectedId) return;
    setBusy(true);
    setError("");
    const res = await fetch(`/api/teachers/${teacherId}/assignments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId: selectedId }),
    });
    if (res.ok) {
      const created = await res.json();
      setAssignments((prev) => [created, ...prev]);
      setSelectedId("");
    } else {
      const data = await res.json();
      setError(data.error || "追加に失敗しました");
    }
    setBusy(false);
  };

  const remove = async (studentId: string) => {
    if (!confirm("担当を解除しますか？")) return;
    setBusy(true);
    const res = await fetch(`/api/teachers/${teacherId}/assignments?studentId=${studentId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setAssignments((prev) => prev.filter((a) => a.student.id !== studentId));
    }
    setBusy(false);
  };

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">担当生徒</h2>

      {canEdit && (
        <div className="flex gap-2 mb-4">
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="">生徒を選択...</option>
            {available.map((s) => (
              <option key={s.id} value={s.id}>
                {s.user.name}（{s.schoolName}）
              </option>
            ))}
          </select>
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
        <p className="text-dark/60 text-sm">担当生徒がいません</p>
      ) : (
        <ul className="divide-y divide-gray-200">
          {assignments.map((a) => (
            <li key={a.id} className="flex justify-between items-center py-2">
              <Link href={`/students/${a.student.id}`} className="text-sm hover:underline">
                {a.student.user.name}
                <span className="text-xs text-dark/60 ml-2">{a.student.schoolName}</span>
              </Link>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => remove(a.student.id)}
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
