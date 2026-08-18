import { prisma } from "@/lib/prisma";

export { formatMinutes, formatYearMonth } from "@/lib/payrollFormat";

// 給与計算（新規依頼 B-9）。出退勤 Attendance から月次の支給額を算出する。
//
// 確定した仕様（オーナー確認 2026-08-18）:
//  (a) 時給は User に紐づける（管理者は Teacher レコードを持たない場合があるため）
//  (b) 分単位で集計し、時給ごとに「合計分 × 時給 ÷ 60」を計算して円未満切り捨て。締めは月末
//  (c) 深夜・残業・交通費は扱わない。必要なら adjustmentYen（手動調整）で吸収する
//  (d) 打刻漏れ（clockOut が null）は警告として一覧に出し、その日は 0 分として集計する（勝手に補完しない）
//  (g) 遡及計算あり。時給の effectiveFrom に過去日付を設定でき、過去月の明細も生成できる
//
// タイムゾーン: clockIn/clockOut は UTC 保存。給与の締めは JST 基準なので、
// 日付の切り出しと月境界の判定はすべて JST に変換してから行う。

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** UTC の Date を JST の壁時計に直した Date（getUTC* で JST の値が読める） */
function toJst(d: Date): Date {
  return new Date(d.getTime() + JST_OFFSET_MS);
}

/** "2026-08" → JST の月初・翌月初を UTC の Date で返す */
export function monthRangeUtc(yearMonth: string): { start: Date; end: Date } {
  const [y, m] = yearMonth.split("-").map(Number);
  // JST 00:00 は UTC の前日 15:00
  const start = new Date(Date.UTC(y, m - 1, 1) - JST_OFFSET_MS);
  const end = new Date(Date.UTC(y, m, 1) - JST_OFFSET_MS);
  return { start, end };
}

/** JST の日付キー "YYYY-MM-DD" */
function jstDateKey(d: Date): string {
  const j = toJst(d);
  const y = j.getUTCFullYear();
  const m = String(j.getUTCMonth() + 1).padStart(2, "0");
  const day = String(j.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** 日付キー "YYYY-MM-DD" を JST 00:00 相当の UTC Date にする（保存用） */
function dateKeyToUtc(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d) - JST_OFFSET_MS);
}

export type PayrollDay = {
  dateKey: string;
  minutes: number;
  hourlyYen: number;
  amountYen: number;
  note: string;
};

export type PayrollCalculation = {
  yearMonth: string;
  totalMinutes: number;
  baseYen: number;
  days: PayrollDay[];
  warnings: string[];
  /** 対象月に適用できる時給が 1 件も無い場合 true（明細は作らせない） */
  missingWage: boolean;
};

/**
 * その日(JST)に適用される時給を返す。effectiveFrom <= 対象日 の中で最も新しいもの。
 * 見つからなければ null（＝まだ時給が設定されていない期間）。
 */
function wageForDate(
  wages: { hourlyYen: number; effectiveFrom: Date }[],
  dateKey: string,
): number | null {
  const target = dateKeyToUtc(dateKey).getTime();
  let best: { hourlyYen: number; t: number } | null = null;
  for (const w of wages) {
    const t = w.effectiveFrom.getTime();
    if (t > target) continue;
    if (!best || t > best.t) best = { hourlyYen: w.hourlyYen, t };
  }
  return best ? best.hourlyYen : null;
}

export async function calculatePayroll(
  userId: string,
  yearMonth: string,
): Promise<PayrollCalculation> {
  const { start, end } = monthRangeUtc(yearMonth);

  const teacher = await prisma.teacher.findUnique({ where: { userId }, select: { id: true } });

  const [wages, attendances] = await Promise.all([
    prisma.hourlyWage.findMany({
      where: { userId },
      orderBy: { effectiveFrom: "asc" },
      select: { hourlyYen: true, effectiveFrom: true },
    }),
    teacher
      ? prisma.attendance.findMany({
          where: { teacherId: teacher.id, clockIn: { gte: start, lt: end } },
          orderBy: { clockIn: "asc" },
        })
      : Promise.resolve([]),
  ]);

  const warnings: string[] = [];
  const byDay = new Map<string, number>();

  for (const a of attendances) {
    const key = jstDateKey(a.clockIn);
    if (!a.clockOut) {
      // (d) 勝手に補完せず 0 分扱い。管理側で出退勤を修正してから再生成してもらう。
      warnings.push(`${key}: 退勤打刻がありません（0分として集計）`);
      byDay.set(key, byDay.get(key) ?? 0);
      continue;
    }
    const minutes = Math.floor((a.clockOut.getTime() - a.clockIn.getTime()) / 60000);
    if (minutes <= 0) {
      warnings.push(`${key}: 退勤が出勤より前または同時刻です（0分として集計）`);
      byDay.set(key, byDay.get(key) ?? 0);
      continue;
    }
    byDay.set(key, (byDay.get(key) ?? 0) + minutes);
  }

  const days: PayrollDay[] = [];
  // (b) 時給ごとに合計分をまとめてから金額にする。月内で時給が変わっても正しく計算できる。
  const minutesByRate = new Map<number, number>();
  let missingWage = false;

  for (const key of Array.from(byDay.keys()).sort()) {
    const minutes = byDay.get(key) ?? 0;
    const rate = wageForDate(wages, key);
    if (rate === null) {
      missingWage = true;
      warnings.push(`${key}: この日に適用できる時給が設定されていません`);
      days.push({ dateKey: key, minutes, hourlyYen: 0, amountYen: 0, note: "時給未設定" });
      continue;
    }
    minutesByRate.set(rate, (minutesByRate.get(rate) ?? 0) + minutes);
    days.push({
      dateKey: key,
      minutes,
      hourlyYen: rate,
      // 行ごとの金額は表示用の内訳（合計は下の rate 単位の計算が正）
      amountYen: Math.floor((minutes * rate) / 60),
      note: "",
    });
  }

  let baseYen = 0;
  for (const [rate, minutes] of minutesByRate) {
    baseYen += Math.floor((minutes * rate) / 60);
  }

  const totalMinutes = days.reduce((s, d) => s + d.minutes, 0);

  if (wages.length === 0) {
    missingWage = true;
    warnings.push("この職員には時給が 1 件も登録されていません");
  }
  if (!teacher) {
    warnings.push("出退勤レコードの紐付け先（講師登録）がないため、勤務時間は 0 分です");
  }

  return { yearMonth, totalMinutes, baseYen, days, warnings, missingWage };
}

/** PayslipItem 保存用に日付キーを Date へ変換する */
export function payslipItemData(days: PayrollDay[]) {
  return days.map((d) => ({
    date: dateKeyToUtc(d.dateKey),
    minutes: d.minutes,
    hourlyYen: d.hourlyYen,
    amountYen: d.amountYen,
    note: d.note,
  }));
}


/** JST の日付表示 "M/D" */
export function formatJstDate(d: Date): string {
  const j = toJst(d);
  return `${j.getUTCMonth() + 1}/${j.getUTCDate()}`;
}
