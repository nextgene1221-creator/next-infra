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
  const attendance = await prisma.attendance.create({
    data: { teacherId: teacher.id, clockIn: now },
  });

  // ルーティンタスクからタスクを生成（dueDate = 当日23:59）
  const routines = await prisma.routineTask.findMany({
    where: { teacherId: teacher.id },
  });
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);

  for (const r of routines) {
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

  return NextResponse.json({ ok: true, attendance, generatedTasks: routines.length });
}
