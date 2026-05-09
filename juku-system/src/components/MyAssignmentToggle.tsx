"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function MyAssignmentToggle({
  studentId,
  teacherId,
  studentName,
  initialAssigned,
}: {
  studentId: string;
  teacherId: string;
  studentName: string;
  initialAssigned: boolean;
}) {
  const router = useRouter();
  const [assigned, setAssigned] = useState(initialAssigned);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const toggle = async () => {
    setError("");
    if (assigned) {
      if (!confirm(`${studentName} の担当を解除しますか?`)) return;
    }
    setBusy(true);
    try {
      if (assigned) {
        const res = await fetch(
          `/api/teachers/${teacherId}/assignments?studentId=${studentId}`,
          { method: "DELETE" },
        );
        if (res.ok) {
          setAssigned(false);
          router.refresh();
        } else {
          const j = await res.json().catch(() => ({}));
          setError(j.error || "解除に失敗しました");
        }
      } else {
        const res = await fetch(`/api/teachers/${teacherId}/assignments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ studentId }),
        });
        if (res.ok) {
          setAssigned(true);
          router.refresh();
        } else {
          const j = await res.json().catch(() => ({}));
          setError(j.error || "追加に失敗しました");
        }
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        className={`text-xs px-3 py-1.5 rounded border ${
          assigned
            ? "border-red-500 text-red-700 hover:bg-red-500 hover:text-white"
            : "border-primary text-primary hover:bg-primary hover:text-white"
        } disabled:opacity-50`}
      >
        {busy ? "処理中..." : assigned ? "自分の担当を解除" : "自分を担当に追加"}
      </button>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}
