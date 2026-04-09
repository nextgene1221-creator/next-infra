import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// 面談時刻を過ぎた未通知の面談タスクをチェックし、出勤中の他講師にアラートを生成
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();

  // 面談時刻を過ぎた未通知の面談タスク
  const dueMeetings = await prisma.task.findMany({
    where: {
      type: "面談",
      meetingAlerted: false,
      meetingDateTime: { lte: now, not: null },
    },
    include: {
      teacher: { include: { user: true } },
      student: { include: { user: true } },
    },
  });

  if (dueMeetings.length === 0) {
    return NextResponse.json({ ok: true, generated: 0 });
  }

  // 出勤中の講師（user情報含む）
  const activeAttendances = await prisma.attendance.findMany({
    where: { clockOut: null },
    include: { teacher: { include: { user: true } } },
  });

  let generatedCount = 0;

  for (const task of dueMeetings) {
    const recipients = activeAttendances
      .filter((a) => a.teacher.id !== task.teacherId)
      .map((a) => a.teacher.user.id);

    const studentName = task.student?.user.name || "（生徒未指定）";
    const message = `質疑応答の担当者を確認し、担当者は声かけを行ってください。対象: ${studentName}（担当: ${task.teacher.user.name}）`;

    for (const userId of recipients) {
      await prisma.alert.create({
        data: {
          userId,
          type: "general",
          title: "面談リマインダー",
          message,
          isRead: false,
        },
      });
      generatedCount++;
    }

    await prisma.task.update({
      where: { id: task.id },
      data: { meetingAlerted: true },
    });
  }

  return NextResponse.json({ ok: true, generated: generatedCount });
}
