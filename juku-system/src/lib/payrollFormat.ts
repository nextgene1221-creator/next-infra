// 給与計算の表示用ヘルパー（クライアント/サーバー両用・prisma 非依存）。
// lib/payroll.ts は prisma を import するためクライアントから読めない。表示だけの関数はこちらに置く。

/** 分 → "H時間MM分" */
export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}時間${String(m).padStart(2, "0")}分`;
}

/** "2026-08" → "2026年8月" */
export function formatYearMonth(yearMonth: string): string {
  const [y, m] = yearMonth.split("-");
  return `${y}年${Number(m)}月`;
}
