"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export type SheetListItem = {
  id: string;
  status: string;
  forMeetingDate: string | null;
  submittedAt: string | null;
  createdAt: string;
};

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" }) : "";

export default function MeetingSheetList({
  initialSheets,
  reminder,
}: {
  initialSheets: SheetListItem[];
  reminder: { show: boolean; daysUntil: number | null; meetingDateLabel: string };
}) {
  const router = useRouter();
  const [sheets] = useState(initialSheets);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const generate = async () => {
    setBusy(true);
    setError("");
    const res = await fetch("/api/meeting-sheets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    if (res.ok) {
      const sheet = await res.json();
      router.push(`/meeting-sheets/${sheet.id}`);
    } else {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "生成に失敗しました");
      setBusy(false);
    }
  };

  const statusBadge = (s: string) =>
    s === "submitted" ? (
      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-medium">提出済</span>
    ) : (
      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-medium">下書き</span>
    );

  return (
    <div className="space-y-4">
      {reminder.show && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center justify-between gap-3 flex-wrap">
          <p className="text-sm text-amber-900">
            面談（{reminder.meetingDateLabel}）まであと
            <span className="font-bold mx-1">{reminder.daysUntil}</span>日です。
            週次面談シートが未提出です。
          </p>
          <button
            onClick={generate}
            disabled={busy}
            className="bg-primary text-white px-4 py-2 rounded-md text-sm hover:bg-primary-dark disabled:opacity-50 whitespace-nowrap"
          >
            {busy ? "準備中..." : "今すぐ記入する"}
          </button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-dark/60">
          {reminder.meetingDateLabel
            ? `次回面談予定: ${reminder.meetingDateLabel}`
            : "次回面談予定は未設定です"}
        </p>
        <button
          onClick={generate}
          disabled={busy}
          className="bg-primary text-white px-4 py-2 rounded-md text-sm hover:bg-primary-dark disabled:opacity-50"
        >
          {busy ? "準備中..." : "今週分を記入する"}
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}

      {sheets.length === 0 ? (
        <p className="text-dark/60 text-sm">まだシートがありません。「今週分を記入する」から始めてください。</p>
      ) : (
        <div className="space-y-2">
          {sheets.map((s) => (
            <Link
              key={s.id}
              href={`/meeting-sheets/${s.id}`}
              className="flex items-center justify-between gap-3 bg-white rounded-lg shadow px-4 py-3 hover:bg-surface"
            >
              <div className="flex items-center gap-3 flex-wrap">
                {statusBadge(s.status)}
                <span className="text-sm text-dark">作成: {fmt(s.createdAt)}</span>
                {s.forMeetingDate && (
                  <span className="text-xs text-dark/60">面談予定: {fmt(s.forMeetingDate)}</span>
                )}
                {s.submittedAt && (
                  <span className="text-xs text-emerald-700">提出: {fmt(s.submittedAt)}</span>
                )}
              </div>
              <span className="text-sm text-primary">
                {s.status === "submitted" ? "見る・修正" : "続きを記入"} →
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
