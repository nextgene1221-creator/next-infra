const MS_DAY = 24 * 60 * 60 * 1000;

export type WeeklyGoalLite = {
  id: string;
  subject: string;
  materialName: string;
  targetPages: number;
  startDate: Date | null;
  dueDate: Date;
  status: string;
  done: number; // 既に完了したページ数
};

type Slot = { subject: string; minutes: number };

// 曜日ごとのスロット配列 (length 7, 日=0)
export type ScheduleSlots = Slot[][];

// 後方互換: 旧 number[] → 新 Slot[][] への変換なし。呼び出し元で slots を渡す。
export type ScheduleByWeekday = number[]; // 未使用だが���互換のために残す

export type TodayItem = {
  goalId: string;
  subject: string;
  materialName: string;
  remainingPages: number;
  remainingMinutes: number;
  todayMinutes: number;
  todayPages: number;
  dueDate: Date;
  reason?: string; // 計算不能時の���由
};

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** 特定曜日のスロットからある科目の合計分数を取得 */
function subjectMinutes(slots: Slot[], subject: string): number {
  return slots
    .filter((s) => s.subject === subject)
    .reduce((sum, s) => sum + s.minutes, 0);
}

export function computeTodayPlan(
  goals: WeeklyGoalLite[],
  scheduleSlots: ScheduleSlots,
  now: Date = new Date()
): TodayItem[] {
  const today = startOfDay(now);
  const todayDow = today.getDay();

  const items: TodayItem[] = [];
  for (const g of goals) {
    if (g.status === "completed") continue;
    const due = startOfDay(g.dueDate);
    if (due.getTime() < today.getTime()) continue;
    const remainingPages = Math.max(0, g.targetPages - g.done);
    if (remainingPages === 0) continue;

    // 今日のこの科目の学習分数
    const todayMinutes = subjectMinutes(scheduleSlots[todayDow] ?? [], g.subject);

    // 今日���期日 までのこの科目の累計学習分数
    let remainingMinutes = 0;
    const daysToDue = Math.floor((due.getTime() - today.getTime()) / MS_DAY) + 1;
    for (let i = 0; i < daysToDue; i++) {
      const d = new Date(today.getTime() + i * MS_DAY);
      remainingMinutes += subjectMinutes(scheduleSlots[d.getDay()] ?? [], g.subject);
    }

    let todayPages = 0;
    let reason: string | undefined;
    if (remainingMinutes <= 0) {
      reason = "残り日数のスケジュールにこの科目がありません";
    } else if (todayMinutes <= 0) {
      reason = "本日のスケジュールにこの科目がありません";
    } else {
      todayPages = Math.ceil((remainingPages / remainingMinutes) * todayMinutes);
    }

    items.push({
      goalId: g.id,
      subject: g.subject,
      materialName: g.materialName,
      remainingPages,
      remainingMinutes,
      todayMinutes,
      todayPages,
      dueDate: due,
      reason,
    });
  }

  // 期���が近い順
  items.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  return items;
}
