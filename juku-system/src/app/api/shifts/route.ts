import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json();
  const { teacherId, date, startTime, endTime, status, notes } = body;

  const shift = await prisma.shift.create({
    data: {
      teacherId,
      date: new Date(date),
      startTime,
      endTime,
      status: status || "scheduled",
      notes: notes || "",
    },
  });

  // 講師にシフト追加通知
  const teacher = await prisma.teacher.findUnique({
    where: { id: teacherId },
    select: { userId: true },
  });
  if (teacher) {
    const dateLabel = new Date(date).toLocaleDateString("ja-JP");
    await prisma.alert.create({
      data: {
        userId: teacher.userId,
        type: "shift_reminder",
        title: "シフトが追加されました",
        message: `${dateLabel} ${startTime} - ${endTime} のシフトが追加されました。`,
        isRead: false,
      },
    });
  }

  return NextResponse.json(shift, { status: 201 });
}
