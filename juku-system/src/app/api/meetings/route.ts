import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role === "student") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // 講師ID取得（ログイン中の講師、または admin の場合は最初の講師）
  const teacher = await prisma.teacher.findFirst({ where: { userId: session.user.id } });
  const teacherId = teacher?.id || (await prisma.teacher.findFirst())?.id;
  if (!teacherId) {
    return NextResponse.json({ error: "No teacher available" }, { status: 400 });
  }

  const body = await req.json();
  const { studentId, date, durationMinutes, type, content, nextMeetingDate, status, parentComment } = body;

  const meeting = await prisma.meeting.create({
    data: {
      studentId,
      teacherId,
      date: new Date(date),
      durationMinutes: durationMinutes ? parseInt(durationMinutes) : null,
      type: type || null,
      status: status === "rescheduled" ? "rescheduled" : "conducted",
      content,
      parentComment: parentComment || "",
      nextMeetingDate: nextMeetingDate ? new Date(nextMeetingDate) : null,
    },
    include: { teacher: { include: { user: true } } },
  });

  return NextResponse.json(meeting, { status: 201 });
}
