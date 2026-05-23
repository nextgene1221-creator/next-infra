"use client";

import { useState, useEffect } from "react";
import AttendanceEditModal from "./AttendanceEditModal";

export default function AttendanceButton({
  campuses = [],
}: {
  campuses?: { code: string; label: string }[];
}) {
  const [clockedIn, setClockedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [attendanceId, setAttendanceId] = useState<string | null>(null);
  const [clockInAt, setClockInAt] = useState<string | null>(null);
  const [clockOutAt, setClockOutAt] = useState<string | null>(null);
  const [campus, setCampus] = useState<string>("");
  const [editing, setEditing] = useState(false);

  const reloadStatus = async () => {
    try {
      const res = await fetch("/api/attendance/status");
      if (!res.ok) return;
      const data = await res.json();
      if (!data.isTeacher) return;
      setClockedIn(!!data.clockedIn);
      setAttendanceId(data.attendanceId || null);
      setClockInAt(data.clockInAt || null);
      setClockOutAt(data.clockOutAt || null);
      setCampus(data.campus || "");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reloadStatus();
  }, []);

  const handleClockIn = async () => {
    setActing(true);
    const res = await fetch("/api/attendance/clock-in", { method: "POST" });
    if (res.ok) {
      await reloadStatus();
    }
    setActing(false);
  };

  const handleClockOut = async () => {
    if (!confirm("退勤しますか？")) return;
    setActing(true);
    const res = await fetch("/api/attendance/clock-out", { method: "POST" });
    if (res.ok) {
      await reloadStatus();
    }
    setActing(false);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-4 animate-pulse">
        <div className="h-8 bg-gray-200 rounded" />
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-dark/60 mb-1">出退勤</p>
            {clockedIn ? (
              <p className="text-sm text-green-600 font-medium">
                出勤中
                {clockInAt && (
                  <span className="text-dark/50 ml-1 font-normal">
                    ({new Date(clockInAt).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}〜)
                  </span>
                )}
                {campus && (
                  <span className="text-dark/60 ml-1 font-normal text-xs">
                    [{campuses.find((c) => c.code === campus)?.label || campus}]
                  </span>
                )}
              </p>
            ) : clockInAt && clockOutAt ? (
              <p className="text-sm text-dark/70">
                本日の打刻:
                <span className="text-dark/50 ml-1">
                  {new Date(clockInAt).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}
                  〜
                  {new Date(clockOutAt).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}
                </span>
                {campus && (
                  <span className="text-dark/60 ml-1 text-xs">
                    [{campuses.find((c) => c.code === campus)?.label || campus}]
                  </span>
                )}
              </p>
            ) : (
              <p className="text-sm text-dark/50">未出勤</p>
            )}
            {attendanceId && clockInAt && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="text-xs text-primary hover:underline mt-1"
              >
                時刻を修正
              </button>
            )}
          </div>
          {clockedIn ? (
            <button
              onClick={handleClockOut}
              disabled={acting}
              className="bg-red-500 text-white px-4 py-2 rounded-md text-sm hover:bg-red-600 disabled:opacity-50"
            >
              {acting ? "処理中..." : "退勤"}
            </button>
          ) : (
            <button
              onClick={handleClockIn}
              disabled={acting}
              className="bg-primary text-white px-4 py-2 rounded-md text-sm hover:bg-primary-dark disabled:opacity-50"
            >
              {acting ? "処理中..." : "出勤"}
            </button>
          )}
        </div>
      </div>
      {editing && attendanceId && clockInAt && (
        <AttendanceEditModal
          attendanceId={attendanceId}
          initialClockIn={clockInAt}
          initialClockOut={clockOutAt}
          initialCampus={campus}
          campuses={campuses}
          onClose={() => {
            setEditing(false);
            reloadStatus();
          }}
        />
      )}
    </>
  );
}
