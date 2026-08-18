import { prisma } from "@/lib/prisma";

// 次回面談予定日の取得（サーバー専用）。
// 優先順: 面談タスク(type=面談)の meetingDateTime > 直近面談記録の nextMeetingDate。
// （タスクと面談記録で相違がある場合はタスクを優先する＝先に判定）
export type NextMeetingInfo = { date: Date; source: "task" | "meeting" } | null;

export async function getNextMeetingInfo(studentId: string): Promise<NextMeetingInfo> {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  // 1) 面談タスク（未完了・本日以降）を優先
  const task = await prisma.task.findFirst({
    where: {
      studentId,
      type: "面談",
      status: { notIn: ["completed", "cancelled"] },
      meetingDateTime: { not: null, gte: startOfToday },
    },
    orderBy: { meetingDateTime: "asc" },
  });
  if (task?.meetingDateTime) return { date: task.meetingDateTime, source: "task" };

  // 2) 面談記録の次回面談予定（本日以降）
  const meeting = await prisma.meeting.findFirst({
    where: { studentId, nextMeetingDate: { not: null, gte: startOfToday } },
    orderBy: { date: "desc" },
  });
  if (meeting?.nextMeetingDate) return { date: meeting.nextMeetingDate, source: "meeting" };

  return null;
}

// 直近の面談以降に「提出済」シートがあるか（=今回分は提出済みか）
export async function hasSubmittedSheetSinceLastMeeting(studentId: string): Promise<boolean> {
  const lastMeeting = await prisma.meeting.findFirst({
    where: { studentId },
    orderBy: { date: "desc" },
    select: { date: true },
  });
  const since = lastMeeting?.date ?? new Date(0);
  const submitted = await prisma.meetingSheet.findFirst({
    where: { studentId, status: "submitted", createdAt: { gt: since } },
    select: { id: true },
  });
  return !!submitted;
}

// 生徒一覧など複数生徒分をまとめて取得する版（N+1 回避）。
// 優先順は getNextMeetingInfo と同一: 面談タスク(type=面談) > 直近面談記録の nextMeetingDate。
export async function getNextMeetingMap(
  studentIds: string[],
): Promise<Map<string, NextMeetingInfo>> {
  const map = new Map<string, NextMeetingInfo>();
  if (studentIds.length === 0) return map;

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [tasks, meetings] = await Promise.all([
    prisma.task.findMany({
      where: {
        studentId: { in: studentIds },
        type: "面談",
        status: { notIn: ["completed", "cancelled"] },
        meetingDateTime: { not: null, gte: startOfToday },
      },
      orderBy: { meetingDateTime: "asc" },
      select: { studentId: true, meetingDateTime: true },
    }),
    prisma.meeting.findMany({
      where: {
        studentId: { in: studentIds },
        nextMeetingDate: { not: null, gte: startOfToday },
      },
      orderBy: { date: "desc" },
      select: { studentId: true, nextMeetingDate: true },
    }),
  ]);

  // タスク優先。昇順で最初に現れたものが各生徒の直近予定。
  for (const t of tasks) {
    if (!t.studentId || !t.meetingDateTime) continue;
    if (!map.has(t.studentId)) map.set(t.studentId, { date: t.meetingDateTime, source: "task" });
  }
  // タスクが無い生徒だけ面談記録で補う。date 降順の先頭＝直近の面談記録。
  for (const m of meetings) {
    if (!m.studentId || !m.nextMeetingDate) continue;
    if (!map.has(m.studentId)) map.set(m.studentId, { date: m.nextMeetingDate, source: "meeting" });
  }

  for (const id of studentIds) if (!map.has(id)) map.set(id, null);
  return map;
}
