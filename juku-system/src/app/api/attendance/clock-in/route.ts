import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // 講師のみ打刻可能
  const teacher = await prisma.teacher.findFirst({ where: { userId: session.user.id } });
  if (!teacher) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  // 既に出勤中（未退勤の打刻あり）かチェック
  const active = await prisma.attendance.findFirst({
    where: { teacherId: teacher.id, clockOut: null },
  });
  if (active) {
    return NextResponse.json({ ok: true, alreadyClockedIn: true });
  }

  const now = new Date();

  // その日のシフトから校舎を自動取得（最も開始時刻が早い1件）。なければ空。
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(now);
  dayEnd.setHours(23, 59, 59, 999);
  const todayShift = await prisma.shift.findFirst({
    where: {
      teacherId: teacher.id,
      date: { gte: dayStart, lte: dayEnd },
      status: { not: "cancelled" },
    },
    orderBy: { startTime: "asc" },
  });
  const inferredCampus = todayShift?.campus || "";

  const attendance = await prisma.attendance.create({
    data: { teacherId: teacher.id, clockIn: now, campus: inferredCampus },
  });

  // ルーティンタスクからタスクを生成（dueDate = 当日23:59）
  // 曜日(JST)が一致するルーティンのみ生成。weekdays が空配列 [] のものは「毎日」扱い。
  const jstWeekday = new Date(now.getTime() + 9 * 60 * 60 * 1000).getUTCDay(); // 0=日..6=土 (JST基準)
  const routines = await prisma.routineTask.findMany({
    where: { teacherId: teacher.id },
  });
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);

  const dueRoutines = routines.filter((r) => {
    let weekdays: number[] = [];
    try {
      const parsed = JSON.parse(r.weekdays);
      if (Array.isArray(parsed)) weekdays = parsed.filter((n) => typeof n === "number");
    } catch {
      weekdays = [];
    }
    // 空配列 = 毎日生成。それ以外は当日(JST)の曜日を含む場合のみ生成。
    return weekdays.length === 0 || weekdays.includes(jstWeekday);
  });

  for (const r of dueRoutines) {
    await prisma.task.create({
      data: {
        teacherId: teacher.id,
        studentId: r.studentId,
        subject: r.subject,
        title: r.title,
        description: r.description,
        type: r.type,
        dueDate: endOfToday,
        status: "pending",
      },
    });
  }

  return NextResponse.json({ ok: true, attendance, generatedTasks: dueRoutines.length });
}
