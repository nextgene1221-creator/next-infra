"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import PayslipView, { type PayslipDetail } from "@/components/PayslipView";
import { formatMinutes, formatYearMonth } from "@/lib/payrollFormat";

// 給与計算の管理画面（新規依頼 B-9 / 2026-08-24 改修）。管理者のみ。
// 時給・交通費の設定 → 月次明細の下書き生成 → 内容確認・調整 → 確定、という流れ。
//
// 2026-08-24 の修正:
//  - 時給の操作は「一覧の下に出るカード」ではなく **モーダル** で行う（どの行を編集中か分からない問題の解消）
//  - 一覧が即時反映されない問題の修正。原因は staff を useState に写して固定していたため、
//    router.refresh() でサーバー側が再計算されても画面が古いままだったこと。props を直接描画し、
//    更新後は useTransition + router.refresh() で確実に再取得する。

export type StaffRow = {
  userId: string;
  name: string;
  role: string;
  currentHourlyYen: number | null;
  transportAllowanceYen: number;
  wageHistory: { id: string; hourlyYen: number; effectiveFrom: string; note: string }[];
  payslip: PayslipDetail | null;
};

const yen = (n: number) => `¥${n.toLocaleString()}`;
const inputCls = "border border-gray-300 rounded-md px-3 py-2 text-sm";

/** ISO(UTC) → JST の "YYYY-MM-DD" */
function jstDay(iso: string): string {
  return new Date(new Date(iso).getTime() + 9 * 3600 * 1000).toISOString().slice(0, 10);
}

export default function PayrollManager({
  yearMonth,
  staff,
}: {
  yearMonth: string;
  staff: StaffRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [openSlip, setOpenSlip] = useState<string | null>(null);
  const [wageFor, setWageFor] = useState<string | null>(null);
  const [adjustFor, setAdjustFor] = useState<string | null>(null);

  const locked = (userId: string) => busy === userId || pending;

  // 変更をサーバーから取り直す。これを通さないと一覧に反映されない。
  const reload = () => startTransition(() => router.refresh());

  const changeMonth = (ym: string) => startTransition(() => router.push(`/payroll?ym=${ym}`));

  const generate = async (userId: string) => {
    setBusy(userId);
    setError("");
    try {
      const res = await fetch("/api/payroll/payslips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, yearMonth }),
      });
      if (res.ok) {
        setOpenSlip(userId); // 生成した明細をそのまま開く
        reload();
      } else {
        const j = await res.json().catch(() => ({}));
        setError(j.error || "明細の生成に失敗しました");
      }
    } catch {
      setError("明細の生成に失敗しました（通信エラー）");
    } finally {
      setBusy(null);
    }
  };

  const patchSlip = async (payslipId: string, body: Record<string, unknown>, userId: string) => {
    setBusy(userId);
    setError("");
    try {
      const res = await fetch(`/api/payroll/payslips/${payslipId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setAdjustFor(null);
        reload();
      } else {
        const j = await res.json().catch(() => ({}));
        setError(j.error || "更新に失敗しました");
      }
    } catch {
      setError("更新に失敗しました（通信エラー）");
    } finally {
      setBusy(null);
    }
  };

  const removeSlip = async (payslipId: string, userId: string) => {
    if (!confirm("この下書き明細を削除しますか？")) return;
    setBusy(userId);
    setError("");
    try {
      const res = await fetch(`/api/payroll/payslips/${payslipId}`, { method: "DELETE" });
      if (res.ok) {
        setOpenSlip(null);
        reload();
      } else {
        const j = await res.json().catch(() => ({}));
        setError(j.error || "削除に失敗しました");
      }
    } catch {
      setError("削除に失敗しました（通信エラー）");
    } finally {
      setBusy(null);
    }
  };

  const wageTarget = staff.find((s) => s.userId === wageFor) ?? null;
  const adjustTarget = staff.find((s) => s.payslip && s.payslip.id === adjustFor) ?? null;

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
        {pending && <span className="text-xs text-dark/50">更新中…</span>}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm print:hidden">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-x-auto print:hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface">
            <tr className="text-xs text-dark/60">
              <th className="text-left px-4 py-3">氏名</th>
              <th className="text-left px-4 py-3 w-20">区分</th>
              <th className="text-right px-4 py-3 w-28">現在の時給</th>
              <th className="text-right px-4 py-3 w-28">交通費/日</th>
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
                <td className="px-4 py-3 text-right text-dark/70">{yen(s.transportAllowanceYen)}</td>
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
                      setError("");
                      setWageFor(s.userId);
                    }}
                    className="text-xs border border-gray-300 rounded px-2 py-1 hover:bg-gray-50"
                  >
                    時給・交通費
                  </button>
                  <button
                    onClick={() => generate(s.userId)}
                    disabled={locked(s.userId) || s.payslip?.status === "confirmed"}
                    className="text-xs border border-gray-300 rounded px-2 py-1 hover:bg-gray-50 disabled:opacity-40"
                  >
                    {busy === s.userId ? "処理中…" : s.payslip ? "再生成" : "明細生成"}
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
                          disabled={locked(s.userId)}
                          className="text-xs bg-primary text-white rounded px-2 py-1 hover:bg-primary-dark disabled:opacity-40"
                        >
                          確定
                        </button>
                      ) : (
                        <button
                          onClick={() => patchSlip(s.payslip!.id, { status: "draft" }, s.userId)}
                          disabled={locked(s.userId)}
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

      {/* 明細表示（印刷対象なので画面内に展開する） */}
      {staff
        .filter((s) => s.payslip && openSlip === s.userId)
        .map((s) => (
          <div key={s.userId} className="space-y-2">
            <PayslipView p={s.payslip!} />
            {s.payslip!.status === "draft" && (
              <div className="bg-white rounded-lg shadow p-4 print:hidden flex flex-wrap items-center gap-2">
                <span className="text-sm text-dark/70">
                  調整: {yen(s.payslip!.adjustmentYen)}
                  {s.payslip!.adjustmentNote && `（${s.payslip!.adjustmentNote}）`}
                </span>
                <button
                  onClick={() => {
                    setError("");
                    setAdjustFor(s.payslip!.id);
                  }}
                  className="text-xs border border-gray-300 rounded px-3 py-1 hover:bg-gray-50"
                >
                  手当・控除を調整
                </button>
                <button
                  onClick={() => removeSlip(s.payslip!.id, s.userId)}
                  disabled={locked(s.userId)}
                  className="text-xs text-red-600 border border-red-200 rounded px-3 py-1 hover:bg-red-50 disabled:opacity-40"
                >
                  下書きを削除
                </button>
              </div>
            )}
          </div>
        ))}

      {wageTarget && (
        <WageDialog
          key={`wage-${wageTarget.userId}-${wageTarget.wageHistory.length}-${wageTarget.transportAllowanceYen}`}
          staff={wageTarget}
          defaultEffectiveFrom={`${yearMonth}-01`}
          onClose={() => setWageFor(null)}
          onSaved={reload}
        />
      )}

      {adjustTarget && adjustTarget.payslip && (
        <AdjustDialog
          key={`adjust-${adjustTarget.payslip.id}`}
          payslip={adjustTarget.payslip}
          onClose={() => setAdjustFor(null)}
          onSave={(body) => patchSlip(adjustTarget.payslip!.id, body, adjustTarget.userId)}
          saving={locked(adjustTarget.userId)}
        />
      )}
    </div>
  );
}

/** モーダルの外枠 */
function Dialog({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 print:hidden"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-base font-bold text-dark">{title}</h2>
          <button
            onClick={onClose}
            aria-label="閉じる"
            className="text-dark/40 hover:text-dark text-xl leading-none px-2"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** 時給と交通費の設定モーダル */
function WageDialog({
  staff,
  defaultEffectiveFrom,
  onClose,
  onSaved,
}: {
  staff: StaffRow;
  defaultEffectiveFrom: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [hourlyYen, setHourlyYen] = useState(
    staff.currentHourlyYen ? String(staff.currentHourlyYen) : "",
  );
  const [effectiveFrom, setEffectiveFrom] = useState(defaultEffectiveFrom);
  const [wageNote, setWageNote] = useState("");
  const [transport, setTransport] = useState(String(staff.transportAllowanceYen));
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  const saveWage = async () => {
    const v = Number(hourlyYen);
    if (!Number.isFinite(v) || v <= 0) {
      setErr("時給は 1 円以上で入力してください");
      return;
    }
    setSaving(true);
    setErr("");
    setMsg("");
    try {
      const res = await fetch("/api/payroll/wages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: staff.userId, hourlyYen: v, effectiveFrom, note: wageNote }),
      });
      if (res.ok) {
        setWageNote("");
        setMsg("時給を保存しました");
        onSaved();
      } else {
        const j = await res.json().catch(() => ({}));
        setErr(j.error || "時給の保存に失敗しました");
      }
    } catch {
      setErr("時給の保存に失敗しました（通信エラー）");
    } finally {
      setSaving(false);
    }
  };

  const saveTransport = async () => {
    const v = Number(transport);
    if (!Number.isFinite(v) || v < 0) {
      setErr("交通費は 0 円以上で入力してください");
      return;
    }
    setSaving(true);
    setErr("");
    setMsg("");
    try {
      const res = await fetch("/api/payroll/allowance", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: staff.userId, transportAllowanceYen: v }),
      });
      if (res.ok) {
        setMsg("交通費を保存しました");
        onSaved();
      } else {
        const j = await res.json().catch(() => ({}));
        setErr(j.error || "交通費の保存に失敗しました");
      }
    } catch {
      setErr("交通費の保存に失敗しました（通信エラー）");
    } finally {
      setSaving(false);
    }
  };

  const deleteWage = async (id: string) => {
    if (!confirm("この時給の履歴を削除しますか？（過去月の明細を再生成すると金額が変わります）")) return;
    setSaving(true);
    setErr("");
    setMsg("");
    try {
      const res = await fetch(`/api/payroll/wages?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setMsg("履歴を削除しました");
        onSaved();
      } else {
        const j = await res.json().catch(() => ({}));
        setErr(j.error || "履歴の削除に失敗しました");
      }
    } catch {
      setErr("履歴の削除に失敗しました（通信エラー）");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      title={`時給・交通費の設定: ${staff.name}（${staff.role === "admin" ? "管理者" : "講師"}）`}
      onClose={onClose}
    >
      {err && <p className="text-sm text-red-600 mb-3">{err}</p>}
      {msg && <p className="text-sm text-green-700 mb-3">{msg}</p>}

      <section className="space-y-3">
        <h3 className="text-sm font-bold text-dark">時給</h3>
        <p className="text-xs text-dark/60">
          現在の時給: {staff.currentHourlyYen == null ? "未設定" : yen(staff.currentHourlyYen)}
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-dark/60 mb-1">新しい時給（円）</label>
            <input
              type="number"
              min={1}
              value={hourlyYen}
              onChange={(e) => setHourlyYen(e.target.value)}
              className={`${inputCls} w-full`}
            />
          </div>
          <div>
            <label className="block text-xs text-dark/60 mb-1">適用開始日</label>
            <input
              type="date"
              value={effectiveFrom}
              onChange={(e) => setEffectiveFrom(e.target.value)}
              className={`${inputCls} w-full`}
            />
          </div>
        </div>
        <div>
          <label className="block text-xs text-dark/60 mb-1">メモ</label>
          <input
            value={wageNote}
            onChange={(e) => setWageNote(e.target.value)}
            placeholder="例: 昇給"
            className={`${inputCls} w-full`}
          />
        </div>
        <button
          onClick={saveWage}
          disabled={saving}
          className="bg-primary text-white px-4 py-2 rounded-md text-sm hover:bg-primary-dark disabled:opacity-50"
        >
          時給を保存
        </button>
        <p className="text-xs text-dark/50">
          過去の日付も指定できます（遡及計算に対応）。適用開始日以降の勤務がこの時給で計算されます。
          保存後、対象月の明細を「再生成」すると金額に反映されます。
        </p>

        <div>
          <p className="text-xs font-bold text-dark/70 mb-1">履歴</p>
          <ul className="text-xs text-dark/70 space-y-1">
            {staff.wageHistory.map((w) => (
              <li key={w.id} className="flex items-center justify-between gap-2">
                <span>
                  {jstDay(w.effectiveFrom)} 〜 {yen(w.hourlyYen)}
                  {w.note && `（${w.note}）`}
                </span>
                <button
                  onClick={() => deleteWage(w.id)}
                  disabled={saving}
                  className="text-red-600 hover:underline disabled:opacity-40"
                >
                  削除
                </button>
              </li>
            ))}
            {staff.wageHistory.length === 0 && <li className="text-dark/40">履歴なし</li>}
          </ul>
        </div>
      </section>

      <hr className="my-5 border-gray-200" />

      <section className="space-y-3">
        <h3 className="text-sm font-bold text-dark">交通費（出勤1日あたり）</h3>
        <div className="flex items-end gap-3">
          <div>
            <label className="block text-xs text-dark/60 mb-1">日額（円）</label>
            <input
              type="number"
              min={0}
              step={10}
              value={transport}
              onChange={(e) => setTransport(e.target.value)}
              className={`${inputCls} w-32`}
            />
          </div>
          <button
            onClick={saveTransport}
            disabled={saving}
            className="bg-primary text-white px-4 py-2 rounded-md text-sm hover:bg-primary-dark disabled:opacity-50"
          >
            交通費を保存
          </button>
        </div>
        <p className="text-xs text-dark/50">
          出勤 1 日につきこの金額が加算されます（既定 200 円）。1 日に複数回の出退勤があっても 1 回だけ付きます。
          金額は講師・管理者の編集画面からも変更できます。
        </p>
      </section>

      <div className="mt-6 text-right">
        <button
          onClick={onClose}
          className="text-dark/60 px-4 py-2 text-sm hover:bg-gray-100 rounded"
        >
          閉じる
        </button>
      </div>
    </Dialog>
  );
}

/** 手当・控除の調整モーダル */
function AdjustDialog({
  payslip,
  onClose,
  onSave,
  saving,
}: {
  payslip: PayslipDetail;
  onClose: () => void;
  onSave: (body: Record<string, unknown>) => void;
  saving: boolean;
}) {
  const [adjustYen, setAdjustYen] = useState(String(payslip.adjustmentYen));
  const [adjustNote, setAdjustNote] = useState(payslip.adjustmentNote);

  return (
    <Dialog title={`手当・控除の調整: ${payslip.userName}`} onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="block text-xs text-dark/60 mb-1">調整額（円・マイナス可）</label>
          <input
            type="number"
            value={adjustYen}
            onChange={(e) => setAdjustYen(e.target.value)}
            className={`${inputCls} w-40`}
          />
        </div>
        <div>
          <label className="block text-xs text-dark/60 mb-1">内訳メモ</label>
          <input
            value={adjustNote}
            onChange={(e) => setAdjustNote(e.target.value)}
            placeholder="例: 深夜手当 1,500円"
            className={`${inputCls} w-full`}
          />
        </div>
        <p className="text-xs text-dark/50">
          交通費は出勤日数から自動計算されるため、ここに入れる必要はありません。
          深夜手当・残業など、自動計算していないものだけを入力してください。
        </p>
        <div className="flex gap-2 pt-2">
          <button
            onClick={() => onSave({ adjustmentYen: Number(adjustYen), adjustmentNote: adjustNote })}
            disabled={saving}
            className="bg-primary text-white px-4 py-2 rounded-md text-sm hover:bg-primary-dark disabled:opacity-50"
          >
            保存
          </button>
          <button
            onClick={onClose}
            className="text-dark/60 px-4 py-2 text-sm hover:bg-gray-100 rounded"
          >
            キャンセル
          </button>
        </div>
      </div>
    </Dialog>
  );
}
