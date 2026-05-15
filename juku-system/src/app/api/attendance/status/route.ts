import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const teacher = await prisma.teacher.findFirst({ where: { userId: session.user.id } });
  if (!teacher) {
    return NextResponse.json({ isTeacher: false });
  }

  // 出勤中（未退勤）の打刻を優先、なければ本日の最新打刻を返す
  const active = await prisma.attendance.findFirst({
    where: { teacherId: teacher.id, clockOut: null },
    orderBy: { clockIn: "desc" },
  });

  if (active) {
    return NextResponse.json({
      isTeacher: true,
      clockedIn: true,
      attendanceId: active.id,
      clockInAt: active.clockIn,
      clockOutAt: null,
    });
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);
  const todayLast = await prisma.attendance.findFirst({
    where: { teacherId: teacher.id, clockIn: { gte: todayStart, lte: todayEnd } },
    orderBy: { clockIn: "desc" },
  });

  return NextResponse.json({
    isTeacher: true,
    clockedIn: false,
    attendanceId: todayLast?.id || null,
    clockInAt: todayLast?.clockIn || null,
    clockOutAt: todayLast?.clockOut || null,
  });
}
