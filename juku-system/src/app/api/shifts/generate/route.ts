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
  const monthStart = new Date(year, m - 1, 1);
  const monthEnd = new Date(year, m, 0, 23, 59, 59, 999);
  const daysInMonth = monthEnd.getDate();

  const templates = await prisma.shiftTemplate.findMany({
    include: { teacher: true },
  });

  let createdCount = 0;
  let skippedCount = 0;
  // 講師ごとに生成数を集計
  const perTeacher = new Map<string, { userId: string; count: number }>();

  for (const tpl of templates) {
    const weekdays = tpl.weekdays.split(",").map(Number);
    const teacherUser = await prisma.teacher.findUnique({
      where: { id: tpl.teacherId },
      select: { userId: true },
    });

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, m - 1, day);
      const dow = date.getDay();
      if (!weekdays.includes(dow)) continue;

      const existing = await prisma.shift.findFirst({
        where: {
          teacherId: tpl.teacherId,
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
          teacherId: tpl.teacherId,
          date,
          startTime: tpl.startTime,
          endTime: tpl.endTime,
          status: "scheduled",
          notes: "",
        },
      });
      createdCount++;

      if (teacherUser) {
        const cur = perTeacher.get(tpl.teacherId) || {
          userId: teacherUser.userId,
          count: 0,
        };
        cur.count++;
        perTeacher.set(tpl.teacherId, cur);
      }
    }
  }

  // 講師ごとに1件のサマリ通知
  for (const [, info] of perTeacher) {
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
