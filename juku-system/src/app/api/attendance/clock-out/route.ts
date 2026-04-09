import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const teacher = await prisma.teacher.findFirst({
    where: { userId: session.user.id },
    include: { user: true },
  });
  if (!teacher) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  // 未退勤の打刻を取得
  const active = await prisma.attendance.findFirst({
    where: { teacherId: teacher.id, clockOut: null },
    orderBy: { clockIn: "desc" },
  });
  if (!active) {
    return NextResponse.json({ ok: true, notClockedIn: true });
  }

  const now = new Date();

  // 退勤打刻
  await prisma.attendance.update({
    where: { id: active.id },
    data: { clockOut: now },
  });

  // 「要引き継ぎ」かつ未完了タスクを取得
  const handoverTasks = await prisma.task.findMany({
    where: {
      teacherId: teacher.id,
      type: "要引き継ぎ",
      status: { in: ["pending", "in_progress"] },
    },
  });

  let assignedTo: string | null = null;

  if (handoverTasks.length > 0) {
    // 出勤中の他の講師を取得
    const others = await prisma.attendance.findMany({
      where: { clockOut: null, teacherId: { not: teacher.id } },
      include: {
        teacher: {
          include: {
            user: true,
            tasks: { where: { status: { in: ["pending", "in_progress"] } } },
            shifts: true,
          },
        },
      },
    });

    if (others.length > 0) {
      const today = new Date(now);
      const todayStart = new Date(today);
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(today);
      todayEnd.setHours(23, 59, 59, 999);

      // 各候補の指標を集計
      const candidates = await Promise.all(
        others.map(async (a) => {
          const t = a.teacher;
          // 当日の面談タスク数
          const meetingCount = await prisma.task.count({
            where: {
              teacherId: t.id,
              type: "面談",
              meetingDateTime: { gte: todayStart, lte: todayEnd },
            },
          });
          // 当日のシフトの最早終了時刻
          const todayShifts = t.shifts.filter((s) => {
            const d = new Date(s.date);
            return d >= todayStart && d <= todayEnd;
          });
          const earliestEnd = todayShifts
            .map((s) => s.endTime)
            .sort()[0] || "23:59";

          return {
            teacherId: t.id,
            name: t.user.name,
            taskCount: t.tasks.length,
            earliestEnd,
            meetingCount,
          };
        })
      );

      // ソート: タスク数 → 退勤時刻 → 面談数 → 名前
      candidates.sort((a, b) => {
        if (a.taskCount !== b.taskCount) return a.taskCount - b.taskCount;
        if (a.earliestEnd !== b.earliestEnd) return a.earliestEnd.localeCompare(b.earliestEnd);
        if (a.meetingCount !== b.meetingCount) return a.meetingCount - b.meetingCount;
        return a.name.localeCompare(b.name);
      });

      const winner = candidates[0];
      assignedTo = winner.name;

      await prisma.task.updateMany({
        where: { id: { in: handoverTasks.map((t) => t.id) } },
        data: { teacherId: winner.teacherId },
      });

      // 受け取った講師のユーザーIDを取得して引き継ぎ通知
      const winnerTeacher = await prisma.teacher.findUnique({
        where: { id: winner.teacherId },
        select: { userId: true },
      });
      if (winnerTeacher) {
        await prisma.alert.create({
          data: {
            userId: winnerTeacher.userId,
            type: "general",
            title: "要引き継ぎタスクを受け取りました",
            message: `${teacher.user?.name || ""}さんから ${handoverTasks.length} 件のタスクが引き継がれました。タスク管理から確認してください。`,
            isRead: false,
          },
        });
      }
    }
  }

  return NextResponse.json({
    ok: true,
    handoverCount: handoverTasks.length,
    assignedTo,
  });
}
