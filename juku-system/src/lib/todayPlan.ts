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

export type ScheduleByWeekday = number[]; // length 7, 日=0

export type TodayItem = {
  goalId: string;
  subject: string;
  materialName: string;
  remainingPages: number;
  remainingHours: number;
  todayHours: number;
  todayPages: number;
  dueDate: Date;
  reason?: string; // 計算不能時の理由
};

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function computeTodayPlan(
  goals: WeeklyGoalLite[],
  schedule: ScheduleByWeekday,
  now: Date = new Date()
): TodayItem[] {
  const today = startOfDay(now);
  const todayHours = schedule[today.getDay()] ?? 0;

  const items: TodayItem[] = [];
  for (const g of goals) {
    if (g.status === "completed") continue;
    const due = startOfDay(g.dueDate);
    if (due.getTime() < today.getTime()) continue;
    const remainingPages = Math.max(0, g.targetPages - g.done);
    if (remainingPages === 0) continue;

    // 今日〜期日 までの累計学習時間（曜日に応じて）
    let remainingHours = 0;
    const daysToDue = Math.floor((due.getTime() - today.getTime()) / MS_DAY) + 1; // 期日含む
    for (let i = 0; i < daysToDue; i++) {
      const d = new Date(today.getTime() + i * MS_DAY);
      remainingHours += schedule[d.getDay()] ?? 0;
    }

    let todayPages = 0;
    let reason: string | undefined;
    if (remainingHours <= 0) {
      reason = "残り日数の学習スケジュールが0時間です";
    } else if (todayHours <= 0) {
      reason = "本日の学習時間が0時間です";
    } else {
      todayPages = Math.ceil((remainingPages / remainingHours) * todayHours);
    }

    items.push({
      goalId: g.id,
      subject: g.subject,
      materialName: g.materialName,
      remainingPages,
      remainingHours,
      todayHours,
      todayPages,
      dueDate: due,
      reason,
    });
  }

  // 期日が近い順
  items.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  return items;
}
