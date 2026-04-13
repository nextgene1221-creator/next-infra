import { prisma } from "@/lib/prisma";

export type StudentAlertFlags = {
  meetingGap: boolean;
  paceAlert: boolean;
  meetingGapDays: number | null;
};

export const MEETING_GAP_THRESHOLD_DAYS = 14;
export const PACE_DELAY_THRESHOLD_DAYS = 14;

function daysSince(date: Date, now = new Date()): number {
  return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
}

// 大目標: 経過日数から期待ページ数を線形で求め、実績との差を日数に換算
export function computeBigGoalDelayDays(bg: {
  targetPages: number;
  startDate: Date;
  dueDate: Date;
  actualPages: number;
}, now = new Date()): number {
  const start = new Date(bg.startDate).getTime();
  const end = new Date(bg.dueDate).getTime();
  if (end <= start || bg.targetPages <= 0) return 0;
  const totalDays = (end - start) / (1000 * 60 * 60 * 24);
  const elapsed = Math.max(0, Math.min(totalDays, (now.getTime() - start) / (1000 * 60 * 60 * 24)));
  const expected = (bg.targetPages * elapsed) / totalDays;
  const shortfall = expected - bg.actualPages;
  if (shortfall <= 0) return 0;
  const pagesPerDay = bg.targetPages / totalDays;
  if (pagesPerDay <= 0) return 0;
  return shortfall / pagesPerDay;
}

export async function computeStudentAlerts(
  studentIds: string[]
): Promise<Map<string, StudentAlertFlags>> {
  const now = new Date();
  const result = new Map<string, StudentAlertFlags>();
  if (studentIds.length === 0) return result;

  const students = await prisma.student.findMany({
    where: { id: { in: studentIds } },
    select: {
      id: true,
      enrollmentDate: true,
      meetings: {
        where: { status: "conducted" },
        orderBy: { date: "desc" },
        take: 1,
        select: { date: true },
      },
      bigGoals: {
        where: { status: "in_progress" },
        select: {
          id: true,
          targetPages: true,
          startDate: true,
          dueDate: true,
          weeklyGoals: {
            select: {
              progressRecords: { select: { pagesCompleted: true } },
            },
          },
        },
      },
    },
  });

  for (const s of students) {
    const base = s.meetings[0]?.date ?? s.enrollmentDate;
    const days = daysSince(new Date(base), now);
    const meetingGap = days >= MEETING_GAP_THRESHOLD_DAYS;

    let paceAlert = false;
    for (const bg of s.bigGoals) {
      const actualPages = bg.weeklyGoals.reduce(
        (sum, wg) => sum + wg.progressRecords.reduce((a, r) => a + r.pagesCompleted, 0),
        0
      );
      const delay = computeBigGoalDelayDays(
        { targetPages: bg.targetPages, startDate: bg.startDate, dueDate: bg.dueDate, actualPages },
        now
      );
      if (delay >= PACE_DELAY_THRESHOLD_DAYS) {
        paceAlert = true;
        break;
      }
    }

    result.set(s.id, { meetingGap, paceAlert, meetingGapDays: days });
  }

  return result;
}

export async function countBothAlertedActiveStudents(): Promise<number> {
  const actives = await prisma.student.findMany({
    where: { status: "active" },
    select: { id: true },
  });
  const flags = await computeStudentAlerts(actives.map((s) => s.id));
  let count = 0;
  for (const f of flags.values()) {
    if (f.meetingGap && f.paceAlert) count++;
  }
  return count;
}
