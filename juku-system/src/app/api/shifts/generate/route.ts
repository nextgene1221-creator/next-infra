import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// 月単位でテンプレートからシフト一括生成（既存スキップ）
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json();
  const { month } = body; // "YYYY-MM"
  if (!month) {
    return NextResponse.json({ error: "month is required" }, { status: 400 });
  }

  const [year, m] = month.split("-").map(Number);
  const monthEnd = new Date(year, m, 0, 23, 59, 59, 999);
  const daysInMonth = monthEnd.getDate();

  // 曜日単位のテンプレートを取得し、{teacherId: {weekday: {start,end}}} に整形
  const templateDays = await prisma.shiftTemplateDay.findMany({
    include: { teacher: { select: { id: true, userId: true } } },
  });

  const perTeacherSchedule = new Map<
    string,
    { userId: string; byWeekday: Map<number, { startTime: string; endTime: string }> }
  >();
  for (const td of templateDays) {
    const entry = perTeacherSchedule.get(td.teacherId) || {
      userId: td.teacher.userId,
      byWeekday: new Map<number, { startTime: string; endTime: string }>(),
    };
    entry.byWeekday.set(td.weekday, { startTime: td.startTime, endTime: td.endTime });
    perTeacherSchedule.set(td.teacherId, entry);
  }

  let createdCount = 0;
  let skippedCount = 0;
  const perTeacherCount = new Map<string, { userId: string; count: number }>();

  for (const [teacherId, { userId, byWeekday }] of perTeacherSchedule) {
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, m - 1, day);
      const dow = date.getDay();
      const slot = byWeekday.get(dow);
      if (!slot) continue;

      const existing = await prisma.shift.findFirst({
        where: {
          teacherId,
          date: {
            gte: new Date(year, m - 1, day, 0, 0, 0, 0),
            lte: new Date(year, m - 1, day, 23, 59, 59, 999),
          },
        },
      });
      if (existing) {
        skippedCount++;
        continue;
      }

      await prisma.shift.create({
        data: {
          teacherId,
          date,
          startTime: slot.startTime,
          endTime: slot.endTime,
          status: "scheduled",
          notes: "",
        },
      });
      createdCount++;

      const cur = perTeacherCount.get(teacherId) || { userId, count: 0 };
      cur.count++;
      perTeacherCount.set(teacherId, cur);
    }
  }

  // 講師ごとに1件のサマリ通知
  for (const [, info] of perTeacherCount) {
    await prisma.alert.create({
      data: {
        userId: info.userId,
        type: "shift_reminder",
        title: "シフトが追加されました",
        message: `${year}年${m}月のシフトが${info.count}件追加されました。シフト管理ページから確認してください。`,
        isRead: false,
      },
    });
  }

  return NextResponse.json({ ok: true, created: createdCount, skipped: skippedCount });
}
