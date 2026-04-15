import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  let { studentId } = body;
  const { subject, date, material, topic, pagesCompleted, goalId } = body;

  if (session.user.role === "student") {
    const student = await prisma.student.findFirst({ where: { userId: session.user.id } });
    if (!student) return NextResponse.json({ error: "No student record" }, { status: 400 });
    studentId = student.id;
  }

  const teacher = await prisma.teacher.findFirst({ where: { userId: session.user.id } });
  const teacherId = teacher?.id || (await prisma.teacher.findFirst())?.id;
  if (!teacherId) {
    return NextResponse.json({ error: "No teacher available" }, { status: 400 });
  }

  const record = await prisma.progressRecord.create({
    data: {
      studentId,
      teacherId,
      subject,
      date: new Date(date),
      material,
      topic: topic || "",
      pagesCompleted: parseInt(pagesCompleted) || 0,
      goalId: goalId || null,
    },
  });

  // 目標と紐づく場合、目標の達成判定
  if (goalId) {
    const goal = await prisma.learningGoal.findUnique({
      where: { id: goalId },
      include: { progressRecords: true },
    });
    if (goal) {
      const totalDone = goal.progressRecords.reduce((sum, r) => sum + r.pagesCompleted, 0);
      if (totalDone >= goal.targetPages && goal.status !== "completed") {
        await prisma.learningGoal.update({
          where: { id: goalId },
          data: { status: "completed" },
        });
      }
    }
  }

  return NextResponse.json(record, { status: 201 });
}
