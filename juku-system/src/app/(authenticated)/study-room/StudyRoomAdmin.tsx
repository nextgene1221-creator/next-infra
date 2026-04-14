"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type StudentPt = { id: string; name: string; schoolName: string; points: number };
type HistoryItem = {
  id: string;
  studentName: string;
  campus: string;
  campusLabel: string;
  checkInAt: string;
  checkOutAt: string;
  autoCheckedOut: boolean;
  pointAwarded: boolean;
};

export default function StudyRoomAdmin({
  studentsWithPoints,
  history,
}: {
  studentsWithPoints: StudentPt[];
  history: HistoryItem[];
}) {
  const router = useRouter();
  const [exchangeId, setExchangeId] = useState("");
  const [exchangePoints, setExchangePoints] = useState(0);
  const [exchangeReason, setExchangeReason] = useState("お菓子交換");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!exchangeId || exchangePoints <= 0) return;
    setBusy(true);
    setError("");
    const res = await fetch("/api/study-room/point-exchange", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId: exchangeId, points: exchangePoints, reason: exchangeReason }),
    });
    if (res.ok) {
      setExchangeId("");
      setExchangePoints(0);
      router.refresh();
    } else {
      const data = await res.json();
      setError(data.error || "失敗しました");
    }
    setBusy(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* ポイント一覧 + 交換 */}
      <section className="bg-white rounded-lg shadow p-4">
        <h2 className="text-lg font-semibold mb-3">生徒ポイント</h2>

        <form onSubmit={submit} className="bg-surface rounded p-3 mb-3 space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <select
              required
              value={exchangeId}
              onChange={(e) => setExchangeId(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 text-sm bg-white"
            >
              <option value="">生徒を選択</option>
              {studentsWithPoints.filter((s) => s.points > 0).map((s) => (
                <option key={s.id} value={s.id}>{s.name} ({s.points}P)</option>
              ))}
            </select>
            <input
              type="number"
              min={1}
              placeholder="消費P"
              value={exchangePoints || ""}
              onChange={(e) => setExchangePoints(parseInt(e.target.value) || 0)}
              className="border border-gray-300 rounded px-2 py-1 text-sm"
            />
            <input
              value={exchangeReason}
              onChange={(e) => setExchangeReason(e.target.value)}
              placeholder="理由"
              className="border border-gray-300 rounded px-2 py-1 text-sm"
            />
          </div>
          <div className="flex gap-2 items-center">
            <button
              type="submit"
              disabled={busy || !exchangeId || exchangePoints <= 0}
              className="bg-primary text-white px-3 py-1.5 rounded text-sm hover:bg-primary-dark disabled:opacity-50"
            >
              ポイントを消費（交換記録）
            </button>
            {error && <span className="text-xs text-red-600">{error}</span>}
          </div>
        </form>

        <ul className="divide-y divide-gray-200 text-sm max-h-96 overflow-y-auto">
          {studentsWithPoints.map((s) => (
            <li key={s.id} className="py-2 flex justify-between">
              <span>
                {s.name}
                <span className="text-xs text-dark/50 ml-2">{s.schoolName}</span>
              </span>
              <span className="font-bold text-primary">{s.points}P</span>
            </li>
          ))}
          {studentsWithPoints.length === 0 && <li className="py-2 text-xs text-dark/50">在籍生徒がいません</li>}
        </ul>
      </section>

      {/* 履歴 */}
      <section className="bg-white rounded-lg shadow p-4">
        <h2 className="text-lg font-semibold mb-3">入退室履歴（直近50件）</h2>
        {history.length === 0 ? (
          <p className="text-sm text-dark/60">履歴がありません</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead className="bg-surface">
                <tr>
                  <th className="px-2 py-1 text-left">生徒</th>
                  <th className="px-2 py-1 text-left">校舎</th>
                  <th className="px-2 py-1 text-left">入室</th>
                  <th className="px-2 py-1 text-left">退室</th>
                  <th className="px-2 py-1 text-center">P</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {history.map((h) => (
                  <tr key={h.id} className={h.autoCheckedOut ? "bg-yellow-50" : ""}>
                    <td className="px-2 py-1">{h.studentName}</td>
                    <td className="px-2 py-1">{h.campusLabel}</td>
                    <td className="px-2 py-1 whitespace-nowrap">
                      {new Date(h.checkInAt).toLocaleString("ja-JP", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="px-2 py-1 whitespace-nowrap">
                      {new Date(h.checkOutAt).toLocaleString("ja-JP", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                      {h.autoCheckedOut && <span className="ml-1 text-[10px] text-yellow-700">(自動)</span>}
                    </td>
                    <td className="px-2 py-1 text-center">{h.pointAwarded ? "+1" : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
