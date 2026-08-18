"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PayslipView, { type PayslipDetail } from "@/components/PayslipView";
import { formatMinutes, formatYearMonth } from "@/lib/payrollFormat";

// 給与計算の管理画面（新規依頼 B-9）。管理者のみ。
// 時給の設定 → 月次明細の下書き生成 → 内容確認・調整 → 確定、という流れ。

export type StaffRow = {
  userId: string;
  name: string;
  role: string;
  currentHourlyYen: number | null;
  wageHistory: { id: string; hourlyYen: number; effectiveFrom: string; note: string }[];
  payslip: PayslipDetail | null;
};

const yen = (n: number) => `¥${n.toLocaleString()}`;

export default function PayrollManager({
  yearMonth,
  staff: initialStaff,
}: {
  yearMonth: string;
  staff: StaffRow[];
}) {
  const router = useRouter();
  const [staff, setStaff] = useState(initialStaff);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [openSlip, setOpenSlip] = useState<string | null>(null);
  const [wageFor, setWageFor] = useState<string | null>(null);

  // 時給入力
  const [hourlyYen, setHourlyYen] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState(`${yearMonth}-01`);
  const [wageNote, setWageNote] = useState("");

  // 調整入力
  const [adjustFor, setAdjustFor] = useState<string | null>(null);
  const [adjustYen, setAdjustYen] = useState("0");
  const [adjustNote, setAdjustNote] = useState("");

  const changeMonth = (ym: string) => router.push(`/payroll?ym=${ym}`);

  const saveWage = async (userId: string) => {
    const v = Number(hourlyYen);
    if (!Number.isFinite(v) || v <= 0) {
      setError("時給は 1 円以上で入力してください");
      return;
    }
    setBusy(userId);
    setError("");
    const res = await fetch("/api/payroll/wages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, hourlyYen: v, effectiveFrom, note: wageNote }),
    });
    if (res.ok) {
      setWageFor(null);
      setHourlyYen("");
      setWageNote("");
      router.refresh();
    } else {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "時給の保存に失敗しました");
    }
    setBusy(null);
  };

  const generate = async (userId: string) => {
    setBusy(userId);
    setError("");
    const res = await fetch("/api/payroll/payslips", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, yearMonth }),
    });
    if (res.ok) {
      router.refresh();
    } else {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "明細の生成に失敗しました");
    }
    setBusy(null);
  };

  const patchSlip = async (payslipId: string, body: Record<string, unknown>, userId: string) => {
    setBusy(userId);
    setError("");
    const res = await fetch(`/api/payroll/payslips/${payslipId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      setAdjustFor(null);
      router.refresh();
    } else {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "更新に失敗しました");
    }
    setBusy(null);
  };

  const removeSlip = async (payslipId: string, userId: string) => {
    if (!confirm("この下書き明細を削除しますか？")) return;
    setBusy(userId);
    setError("");
    const res = await fetch(`/api/payroll/payslips/${payslipId}`, { method: "DELETE" });
    if (res.ok) {
      setStaff((prev) => prev.map((s) => (s.userId === userId ? { ...s, payslip: null } : s)));
      router.refresh();
    } else {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "削除に失敗しました");
    }
    setBusy(null);
  };

  const inputCls = "border border-gray-300 rounded-md px-3 py-2 text-sm";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 print:hidden">
        <label className="text-sm text-dark/70">対象月</label>
        <input
          type="month"
          value={yearMonth}
          onChange={(e) => changeMonth(e.target.value)}
          className={inputCls}
        />
        <span className="text-sm text-dark/60">{formatYearMonth(yearMonth)}分</span>
      </div>

      {error && <p className="text-sm text-red-600 print:hidden">{error}</p>}

      <div className="bg-white rounded-lg shadow overflow-x-auto print:hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface">
            <tr className="text-xs text-dark/60">
              <th className="text-left px-4 py-3">氏名</th>
              <th className="text-left px-4 py-3 w-20">区分</th>
              <th className="text-right px-4 py-3 w-28">現在の時給</th>
              <th className="text-right px-4 py-3 w-28">勤務時間</th>
              <th className="text-right px-4 py-3 w-28">支給合計</th>
              <th className="text-left px-4 py-3 w-20">状態</th>
              <th className="text-right px-4 py-3 w-72">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {staff.map((s) => (
              <tr key={s.userId}>
                <td className="px-4 py-3 font-medium text-dark">{s.name}</td>
                <td className="px-4 py-3 text-dark/70">{s.role === "admin" ? "管理者" : "講師"}</td>
                <td className="px-4 py-3 text-right">
                  {s.currentHourlyYen == null ? (
                    <span className="text-red-600 text-xs">未設定</span>
                  ) : (
                    yen(s.currentHourlyYen)
                  )}
                </td>
                <td className="px-4 py-3 text-right text-dark/70">
                  {s.payslip ? formatMinutes(s.payslip.totalMinutes) : "—"}
                </td>
                <td className="px-4 py-3 text-right font-medium">
                  {s.payslip ? yen(s.payslip.totalYen) : "—"}
                </td>
                <td className="px-4 py-3">
                  {s.payslip ? (
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs ${
                        s.payslip.status === "confirmed"
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {s.payslip.status === "confirmed" ? "確定" : "下書き"}
                    </span>
                  ) : (
                    <span className="text-xs text-dark/40">未生成</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right space-x-1">
                  <button
                    onClick={() => {
                      setWageFor(wageFor === s.userId ? null : s.userId);
                      setHourlyYen(s.currentHourlyYen ? String(s.currentHourlyYen) : "");
                    }}
                    className="text-xs border border-gray-300 rounded px-2 py-1 hover:bg-gray-50"
                  >
                    時給
                  </button>
                  <button
                    onClick={() => generate(s.userId)}
                    disabled={busy === s.userId || s.payslip?.status === "confirmed"}
                    className="text-xs border border-gray-300 rounded px-2 py-1 hover:bg-gray-50 disabled:opacity-40"
                  >
                    {s.payslip ? "再生成" : "明細生成"}
                  </button>
                  {s.payslip && (
                    <>
                      <button
                        onClick={() => setOpenSlip(openSlip === s.userId ? null : s.userId)}
                        className="text-xs border border-gray-300 rounded px-2 py-1 hover:bg-gray-50"
                      >
                        {openSlip === s.userId ? "閉じる" : "明細"}
                      </button>
                      {s.payslip.status === "draft" ? (
                        <button
                          onClick={() => patchSlip(s.payslip!.id, { status: "confirmed" }, s.userId)}
                          disabled={busy === s.userId}
                          className="text-xs bg-primary text-white rounded px-2 py-1 hover:bg-primary-dark disabled:opacity-40"
                        >
                          確定
                        </button>
                      ) : (
                        <button
                          onClick={() => patchSlip(s.payslip!.id, { status: "draft" }, s.userId)}
                          disabled={busy === s.userId}
                          className="text-xs border border-amber-300 text-amber-700 rounded px-2 py-1 hover:bg-amber-50 disabled:opacity-40"
                        >
                          確定解除
                        </button>
                      )}
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 時給設定 */}
      {wageFor && (
        <div className="bg-white rounded-lg shadow p-4 print:hidden">
          <h2 className="text-sm font-bold text-dark mb-3">
            時給の設定: {staff.find((s) => s.userId === wageFor)?.name}
          </h2>
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs text-dark/60 mb-1">時給（円）</label>
              <input type="number" value={hourlyYen} onChange={(e) => setHourlyYen(e.target.value)} className={`${inputCls} w-32`} />
            </div>
            <div>
              <label className="block text-xs text-dark/60 mb-1">適用開始日</label>
              <input type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} className={inputCls} />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs text-dark/60 mb-1">メモ</label>
              <input value={wageNote} onChange={(e) => setWageNote(e.target.value)} className={`${inputCls} w-full`} />
            </div>
            <button
              onClick={() => saveWage(wageFor)}
              disabled={busy === wageFor}
              className="bg-primary text-white px-4 py-2 rounded-md text-sm hover:bg-primary-dark disabled:opacity-50"
            >
              保存
            </button>
            <button onClick={() => setWageFor(null)} className="text-dark/60 px-3 py-2 text-sm hover:bg-gray-100 rounded">
              閉じる
            </button>
          </div>
          <p className="text-xs text-dark/50 mt-2">
            過去の日付も指定できます（遡及計算に対応）。適用開始日以降の勤務がこの時給で計算されます。
          </p>
          <div className="mt-3">
            <p className="text-xs font-bold text-dark/70 mb-1">履歴</p>
            <ul className="text-xs text-dark/70 space-y-0.5">
              {(staff.find((s) => s.userId === wageFor)?.wageHistory ?? []).map((w) => (
                <li key={w.id}>
                  {new Date(new Date(w.effectiveFrom).getTime() + 9 * 3600 * 1000)
                    .toISOString()
                    .slice(0, 10)}{" "}
                  〜 {yen(w.hourlyYen)} {w.note && `（${w.note}）`}
                </li>
              ))}
              {(staff.find((s) => s.userId === wageFor)?.wageHistory ?? []).length === 0 && (
                <li className="text-dark/40">履歴なし</li>
              )}
            </ul>
          </div>
        </div>
      )}

      {/* 明細表示 */}
      {staff
        .filter((s) => s.payslip && openSlip === s.userId)
        .map((s) => (
          <div key={s.userId} className="space-y-2">
            <PayslipView p={s.payslip!} />
            {s.payslip!.status === "draft" && (
              <div className="bg-white rounded-lg shadow p-4 print:hidden">
                <h3 className="text-sm font-bold text-dark mb-2">手当・控除の調整</h3>
                {adjustFor === s.payslip!.id ? (
                  <div className="flex flex-wrap gap-3 items-end">
                    <div>
                      <label className="block text-xs text-dark/60 mb-1">調整額（円・マイナス可）</label>
                      <input type="number" value={adjustYen} onChange={(e) => setAdjustYen(e.target.value)} className={`${inputCls} w-32`} />
                    </div>
                    <div className="flex-1 min-w-[200px]">
                      <label className="block text-xs text-dark/60 mb-1">内訳メモ</label>
                      <input value={adjustNote} onChange={(e) => setAdjustNote(e.target.value)} placeholder="例: 交通費 3,000円" className={`${inputCls} w-full`} />
                    </div>
                    <button
                      onClick={() =>
                        patchSlip(s.payslip!.id, { adjustmentYen: Number(adjustYen), adjustmentNote: adjustNote }, s.userId)
                      }
                      disabled={busy === s.userId}
                      className="bg-primary text-white px-4 py-2 rounded-md text-sm hover:bg-primary-dark disabled:opacity-50"
                    >
                      保存
                    </button>
                    <button onClick={() => setAdjustFor(null)} className="text-dark/60 px-3 py-2 text-sm hover:bg-gray-100 rounded">
                      キャンセル
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setAdjustFor(s.payslip!.id);
                        setAdjustYen(String(s.payslip!.adjustmentYen));
                        setAdjustNote(s.payslip!.adjustmentNote);
                      }}
                      className="text-xs border border-gray-300 rounded px-3 py-1 hover:bg-gray-50"
                    >
                      調整を入力
                    </button>
                    <button
                      onClick={() => removeSlip(s.payslip!.id, s.userId)}
                      className="text-xs text-red-600 border border-red-200 rounded px-3 py-1 hover:bg-red-50"
                    >
                      下書きを削除
                    </button>
                  </div>
                )}
                <p className="text-xs text-dark/50 mt-2">
                  深夜手当・残業・交通費は自動計算していません。必要な場合はここで調整額として入れてください。
                </p>
              </div>
            )}
          </div>
        ))}
    </div>
  );
}
