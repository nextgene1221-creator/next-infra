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

  // ---- スナップショット: 大目標/指標 ----
  const bigGoals = await prisma.bigGoal.findMany({
    where: { studentId },
    include: {
      weeklyGoals: { include: { progressRecords: { select: { pagesCompleted: true } } } },
    },
    orderBy: { dueDate: "asc" },
  });
  const goalsSnapshot = bigGoals.map((b) => ({
    subject: b.subject,
    materialName: b.materialName,
    targetPages: b.targetPages,
    done: b.weeklyGoals.reduce(
      (sum, w) => sum + w.progressRecords.reduce((s, r) => s + r.pagesCompleted, 0),
      0
    ),
    startDate: b.startDate.toISOString(),
    dueDate: b.dueDate.toISOString(),
    status: b.status,
  }));

  // ---- スナップショット: 前回面談〜今回の学習進捗 ----
  const lastMeeting = await prisma.meeting.findFirst({
    where: { studentId },
    orderBy: { date: "desc" },
  });
  const sinceDate = lastMeeting ? lastMeeting.date : new Date(0);
  const progressRecords = await prisma.progressRecord.findMany({
    where: {
      studentId,
      date: { gt: sinceDate },
    },
    include: { teacher: { include: { user: { select: { name: true } } } } },
    orderBy: { date: "asc" },
  });
  const progressSnapshot = progressRecords.map((p) => ({
    date: p.date.toISOString(),
    subject: p.subject,
    material: p.material,
    topic: p.topic,
    pagesCompleted: p.pagesCompleted,
    teacherName: p.teacher.user.name,
  }));

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
      goalsSnapshot: JSON.stringify(goalsSnapshot),
      progressSnapshot: JSON.stringify(progressSnapshot),
      nextMeetingDate: nextMeetingDate ? new Date(nextMeetingDate) : null,
    },
    include: { teacher: { include: { user: true } } },
  });

  return NextResponse.json(meeting, { status: 201 });
}
