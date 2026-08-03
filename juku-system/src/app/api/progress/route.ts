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
  const { subject, date, material, topic, pagesCompleted, goalId, bigGoalId } = body;

  if (session.user.role === "student") {
    const student = await prisma.student.findFirst({ where: { userId: session.user.id } });
    if (!student) return NextResponse.json({ error: "No student record" }, { status: 400 });
    studentId = student.id;
  }

  // 担当講師 = ログイン中の講師。管理者など講師でない場合は担当なし(null)。
  // （以前は最初の講師=佐藤駿へ自動割当していたが、誤った担当付けになるため廃止）
  const teacher = await prisma.teacher.findFirst({ where: { userId: session.user.id } });
  const teacherId = teacher?.id ?? null;

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
      bigGoalId: bigGoalId || null,
    },
  });

  // 週次目標と紐づく場合、目標の達成判定
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

  // 大目標と紐づく場合、目標の達成判定（直紐付き + 配下週次目標の合計）
  if (bigGoalId) {
    const bigGoal = await prisma.bigGoal.findUnique({
      where: { id: bigGoalId },
      include: {
        progressRecords: { select: { pagesCompleted: true } },
        weeklyGoals: { include: { progressRecords: { select: { pagesCompleted: true } } } },
      },
    });
    if (bigGoal) {
      const directDone = bigGoal.progressRecords.reduce((s, r) => s + r.pagesCompleted, 0);
      const weeklyDone = bigGoal.weeklyGoals.reduce(
        (sum, w) => sum + w.progressRecords.reduce((s, r) => s + r.pagesCompleted, 0),
        0,
      );
      const totalDone = directDone + weeklyDone;
      if (totalDone >= bigGoal.targetPages && bigGoal.status !== "completed") {
        await prisma.bigGoal.update({
          where: { id: bigGoalId },
          data: { status: "completed" },
        });
      }
    }
  }

  return NextResponse.json(record, { status: 201 });
}
