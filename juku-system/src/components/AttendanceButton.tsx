"use client";

import { useState, useEffect } from "react";

export default function AttendanceButton() {
  const [clockedIn, setClockedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [clockInAt, setClockInAt] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/attendance/status")
      .then((r) => r.json())
      .then((data) => {
        if (!data.isTeacher) {
          setLoading(false);
          return;
        }
        setClockedIn(data.clockedIn);
        setClockInAt(data.clockInAt);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleClockIn = async () => {
    setActing(true);
    const res = await fetch("/api/attendance/clock-in", { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      setClockedIn(true);
      setClockInAt(data.clockIn || new Date().toISOString());
    }
    setActing(false);
  };

  const handleClockOut = async () => {
    if (!confirm("退勤しますか？")) return;
    setActing(true);
    const res = await fetch("/api/attendance/clock-out", { method: "POST" });
    if (res.ok) {
      setClockedIn(false);
      setClockInAt(null);
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
            </p>
          ) : (
            <p className="text-sm text-dark/50">未出勤</p>
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
  );
}
