"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  attendanceId: string;
  teacherName?: string;
  initialClockIn: string; // ISO
  initialClockOut: string | null; // ISO or null
  onClose: () => void;
  allowDelete?: boolean;
};

// "2026-05-15T13:45:00.000Z" → ローカル時刻の "2026-05-15T13:45"
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ローカル時刻の "2026-05-15T13:45" → ISO
function fromLocalInput(local: string): string {
  return new Date(local).toISOString();
}

export default function AttendanceEditModal({
  attendanceId,
  teacherName,
  initialClockIn,
  initialClockOut,
  onClose,
  allowDelete = false,
}: Props) {
  const router = useRouter();
  const [clockIn, setClockIn] = useState(toLocalInput(initialClockIn));
  const [clockOut, setClockOut] = useState(
    initialClockOut ? toLocalInput(initialClockOut) : "",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch(`/api/attendance/${attendanceId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clockIn: fromLocalInput(clockIn),
        clockOut: clockOut ? fromLocalInput(clockOut) : null,
      }),
    });
    if (res.ok) {
      router.refresh();
      onClose();
    } else {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "更新に失敗しました");
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("この打刻記録を削除しますか?")) return;
    setSaving(true);
    setError("");
    const res = await fetch(`/api/attendance/${attendanceId}`, { method: "DELETE" });
    if (res.ok) {
      router.refresh();
      onClose();
    } else {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "削除に失敗しました");
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-dark mb-4">
          出退勤時間の修正{teacherName ? `（${teacherName}）` : ""}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">出勤時刻</label>
            <input
              type="datetime-local"
              required
              value={clockIn}
              onChange={(e) => setClockIn(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">
              退勤時刻 <span className="text-xs text-dark/60">（空欄の場合は勤務中）</span>
            </label>
            <input
              type="datetime-local"
              value={clockOut}
              onChange={(e) => setClockOut(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
              {error}
            </div>
          )}
          <div className="flex justify-between items-center gap-2 pt-2">
            <div>
              {allowDelete && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={saving}
                  className="text-red-600 px-3 py-2 rounded-md text-sm hover:bg-red-50 disabled:opacity-50"
                >
                  削除
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="bg-surface text-charcoal px-4 py-2 rounded-md text-sm hover:bg-gray-200 disabled:opacity-50"
              >
                キャンセル
              </button>
              <button
                type="submit"
                disabled={saving}
                className="bg-primary text-white px-4 py-2 rounded-md text-sm hover:bg-primary-dark disabled:opacity-50"
              >
                {saving ? "保存中..." : "保存"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
