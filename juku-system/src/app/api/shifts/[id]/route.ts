import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const { teacherId, date, startTime, endTime, status, notes } = body;

  const before = await prisma.shift.findUnique({
    where: { id },
    include: { teacher: { select: { userId: true } } },
  });

  const shift = await prisma.shift.update({
    where: { id },
    data: {
      ...(teacherId ? { teacherId } : {}),
      ...(date ? { date: new Date(date) } : {}),
      ...(startTime ? { startTime } : {}),
      ...(endTime ? { endTime } : {}),
      ...(status ? { status } : {}),
      ...(notes !== undefined ? { notes } : {}),
    },
  });

  // シフト変更通知
  if (before) {
    const dateLabel = new Date(shift.date).toLocaleDateString("ja-JP");
    const isCancelled = status === "cancelled" && before.status !== "cancelled";
    const title = isCancelled ? "シフトがキャンセルされました" : "シフトが変更されました";
    const message = isCancelled
      ? `${dateLabel} のシフトがキャンセルされました。`
      : `${dateLabel} ${shift.startTime} - ${shift.endTime} に変更されました。`;

    await prisma.alert.create({
      data: {
        userId: before.teacher.userId,
        type: "shift_reminder",
        title,
        message,
        isRead: false,
      },
    });

    // 担当者が変わった場合、新担当者にも通知
    if (teacherId && teacherId !== before.teacherId) {
      const newTeacher = await prisma.teacher.findUnique({
        where: { id: teacherId },
        select: { userId: true },
      });
      if (newTeacher) {
        await prisma.alert.create({
          data: {
            userId: newTeacher.userId,
            type: "shift_reminder",
            title: "シフトが追加されました",
            message: `${dateLabel} ${shift.startTime} - ${shift.endTime} のシフトが追加されました。`,
            isRead: false,
          },
        });
      }
    }
  }

  return NextResponse.json(shift);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const shift = await prisma.shift.findUnique({
    where: { id },
    include: { teacher: { select: { userId: true } } },
  });

  await prisma.shift.delete({ where: { id } });

  // 講師に削除通知
  if (shift) {
    const dateLabel = new Date(shift.date).toLocaleDateString("ja-JP");
    await prisma.alert.create({
      data: {
        userId: shift.teacher.userId,
        type: "shift_reminder",
        title: "シフトが削除されました",
        message: `${dateLabel} ${shift.startTime} - ${shift.endTime} のシフトが削除されました。`,
        isRead: false,
      },
    });
  }

  return NextResponse.json({ success: true });
}
