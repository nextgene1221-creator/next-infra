"use client";

import { Fragment, useState } from "react";
import { useRouter } from "next/navigation";
import type { TodayPrintRow } from "@/lib/todayPrints";

// 当日使用するゼミプリント一覧（講師・管理者向け）。ダッシュボードとゼミ管理で共有する。
// 表示だけでなく、生徒ごとの実施完了もこの画面から登録できる（新規依頼 B-5）。
//
// 「完了」＝生徒がそのプリントを実施し終えたこと。印刷や配布準備の完了ではない。
// 実施状況は生徒ごとに異なるため、一括完了ボタンは設けない（オーナー確認 2026-08-18）。

export default function TodayPrintsPanel({
  rows: initialRows,
  canUncomplete,
  title = "本日使用するゼミプリント",
}: {
  rows: TodayPrintRow[];
  /** 完了の取り消しは講師・管理者のみ（B-4 と同じ規則） */
  canUncomplete: boolean;
  title?: string;
}) {
  const router = useRouter();
  const [rows, setRows] = useState(initialRows);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  if (rows.length === 0) return null;

  const toggleExpand = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const setCompleted = async (printId: string, completed: boolean) => {
    if (completed === false && !confirm("このプリントの完了を取り消しますか？\n予定日はそのまま残ります。")) return;
    setBusyId(printId);
    setError("");
    const res = await fetch("/api/student-prints", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: printId,
        completedDate: completed ? new Date().toISOString().split("T")[0] : null,
      }),
    });
    if (res.ok) {
      setRows((prev) =>
        prev.map((r) => {
          if (!r.students.some((s) => s.printId === printId)) return r;
          const students = r.students.map((s) => (s.printId === printId ? { ...s, completed } : s));
          return { ...r, students, remaining: students.filter((s) => !s.completed).length };
        }),
      );
      router.refresh();
    } else {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "更新に失敗しました");
    }
    setBusyId(null);
  };

  const totalSheets = rows.reduce((s, r) => s + r.total, 0);
  const totalRemaining = rows.reduce((s, r) => s + r.remaining, 0);

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <h2 className="text-lg font-semibold text-dark mb-1">{title}</h2>
      <p className="text-xs text-dark/50 mb-3">
        行をクリックすると対象生徒が開きます。生徒ごとに実施完了を登録できます。
      </p>
      {error && <p className="text-xs text-red-600 mb-2">{error}</p>}

      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-dark/60 border-b">
            <th className="text-left py-1">科目</th>
            <th className="text-left py-1">単元</th>
            <th className="text-right py-1 w-12">No.</th>
            <th className="text-right py-1 w-16">必要枚数</th>
            <th className="text-right py-1 w-16">未実施</th>
            <th className="text-left py-1 pl-4">対象生徒</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const isOpen = expanded.has(r.key);
            return (
              <Fragment key={r.key}>
                <tr
                  className="border-b border-gray-50 cursor-pointer hover:bg-surface"
                  onClick={() => toggleExpand(r.key)}
                >
                  <td className="py-1">{r.subject}</td>
                  <td className="py-1">{r.unitName}</td>
                  <td className="py-1 text-right">{r.printNo}</td>
                  <td className="py-1 text-right font-bold text-primary">{r.total}</td>
                  <td className={`py-1 text-right font-medium ${r.remaining === 0 ? "text-green-600" : "text-dark"}`}>
                    {r.remaining === 0 ? "完了" : r.remaining}
                  </td>
                  <td className="py-1 pl-4 text-xs text-dark/70">
                    {r.students.map((s) => (
                      <span key={s.printId} className={s.completed ? "text-dark/35 line-through mr-1" : "mr-1"}>
                        {s.studentName}
                      </span>
                    ))}
                    <span className="text-dark/40 ml-1">{isOpen ? "▲" : "▼"}</span>
                  </td>
                </tr>
                {isOpen && (
                  <tr className="border-b border-gray-100 bg-surface/50">
                    <td colSpan={6} className="py-2 px-2">
                      <div className="flex flex-wrap gap-2">
                        {r.students.map((s) => (
                          <div
                            key={s.printId}
                            className="flex items-center gap-2 bg-white border border-gray-200 rounded px-2 py-1"
                          >
                            <span className={`text-sm ${s.completed ? "text-dark/40 line-through" : "text-dark"}`}>
                              {s.studentName}
                            </span>
                            {s.completed ? (
                              canUncomplete ? (
                                <button
                                  type="button"
                                  disabled={busyId === s.printId}
                                  onClick={() => setCompleted(s.printId, false)}
                                  className="text-xs bg-amber-600 text-white px-2 py-0.5 rounded hover:bg-amber-700 disabled:opacity-50"
                                >
                                  取り消し
                                </button>
                              ) : (
                                <span className="text-xs text-green-600">完了</span>
                              )
                            ) : (
                              <button
                                type="button"
                                disabled={busyId === s.printId}
                                onClick={() => setCompleted(s.printId, true)}
                                className="text-xs bg-green-600 text-white px-2 py-0.5 rounded hover:bg-green-700 disabled:opacity-50"
                              >
                                完了
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>

      <p className="text-xs text-dark/50 mt-2">
        合計 {totalSheets} 枚 ({rows.length} 種類) / 未実施 {totalRemaining} 件
      </p>
    </div>
  );
}
