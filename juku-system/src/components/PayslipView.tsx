"use client";

import { formatMinutes } from "@/lib/payrollFormat";

// 給与明細の表示（新規依頼 B-9）。管理者画面と本人画面で共有する。
// 出力は画面表示＋ブラウザ印刷（window.print()）。PDF ライブラリは新規に入れない（B-9(e)）。

export type PayslipItemView = {
  id: string;
  date: string;
  minutes: number;
  hourlyYen: number;
  amountYen: number;
  note: string;
};

export type PayslipDetail = {
  id: string;
  userName: string;
  yearMonth: string;
  totalMinutes: number;
  baseYen: number;
  adjustmentYen: number;
  adjustmentNote: string;
  totalYen: number;
  status: string;
  confirmedAt: string | null;
  warnings: string[];
  items: PayslipItemView[];
};

const yen = (n: number) => `¥${n.toLocaleString()}`;

// JST の M/D 表示。date は UTC ISO 文字列（JST 00:00 相当）。
function jstMD(iso: string): string {
  const d = new Date(new Date(iso).getTime() + 9 * 60 * 60 * 1000);
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
}

export default function PayslipView({ p }: { p: PayslipDetail }) {
  return (
    <div className="bg-white rounded-lg shadow p-6 print:shadow-none">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b pb-3 mb-4">
        <div>
          <h2 className="text-lg font-bold text-dark">給与明細</h2>
          <p className="text-sm text-dark/70">
            {p.yearMonth.replace("-", "年")}月分 ／ {p.userName}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              p.status === "confirmed" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
            }`}
          >
            {p.status === "confirmed" ? "確定" : "下書き"}
          </span>
          <button
            onClick={() => window.print()}
            className="text-xs border border-gray-300 rounded px-3 py-1 hover:bg-gray-50 print:hidden"
          >
            印刷
          </button>
        </div>
      </div>

      {p.warnings.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded p-3 mb-4">
          <p className="text-xs font-bold text-amber-800 mb-1">確認が必要な点</p>
          <ul className="text-xs text-amber-800 space-y-0.5">
            {p.warnings.map((w, i) => (
              <li key={i}>・{w}</li>
            ))}
          </ul>
          <p className="text-[11px] text-amber-700 mt-2">
            打刻漏れの日は 0 分として集計しています。出退勤を修正してから明細を再生成してください。
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="bg-surface rounded p-3">
          <p className="text-xs text-dark/60">勤務時間</p>
          <p className="text-lg font-bold text-dark">{formatMinutes(p.totalMinutes)}</p>
        </div>
        <div className="bg-surface rounded p-3">
          <p className="text-xs text-dark/60">勤務分支給</p>
          <p className="text-lg font-bold text-dark">{yen(p.baseYen)}</p>
        </div>
        <div className="bg-surface rounded p-3">
          <p className="text-xs text-dark/60">調整</p>
          <p className="text-lg font-bold text-dark">{yen(p.adjustmentYen)}</p>
        </div>
        <div className="bg-primary/10 rounded p-3">
          <p className="text-xs text-primary">支給合計</p>
          <p className="text-lg font-bold text-primary">{yen(p.totalYen)}</p>
        </div>
      </div>

      {p.adjustmentNote && (
        <p className="text-xs text-dark/70 mb-4">調整の内訳: {p.adjustmentNote}</p>
      )}

      <h3 className="text-sm font-bold text-dark mb-2">内訳（日別）</h3>
      {p.items.length === 0 ? (
        <p className="text-sm text-dark/50">対象月の勤務記録がありません。</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-dark/60 border-b">
              <th className="text-left py-1 w-20">日付</th>
              <th className="text-right py-1 w-28">勤務時間</th>
              <th className="text-right py-1 w-24">時給</th>
              <th className="text-right py-1 w-28">金額</th>
              <th className="text-left py-1 pl-4">備考</th>
            </tr>
          </thead>
          <tbody>
            {p.items.map((it) => (
              <tr key={it.id} className="border-b border-gray-50">
                <td className="py-1">{jstMD(it.date)}</td>
                <td className="py-1 text-right">{formatMinutes(it.minutes)}</td>
                <td className="py-1 text-right">{it.hourlyYen > 0 ? yen(it.hourlyYen) : "—"}</td>
                <td className="py-1 text-right">{yen(it.amountYen)}</td>
                <td className="py-1 pl-4 text-xs text-dark/60">{it.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <p className="text-[11px] text-dark/50 mt-3">
        時給ごとに「合計勤務分 × 時給 ÷ 60」を計算し、円未満を切り捨てています（日別金額の単純合計とは端数が異なる場合があります）。
        深夜・残業・交通費は含みません。締めは月末（JST）です。
      </p>
      {p.confirmedAt && (
        <p className="text-[11px] text-dark/50 mt-1">
          確定日時: {new Date(p.confirmedAt).toLocaleString("ja-JP")}
        </p>
      )}
    </div>
  );
}
