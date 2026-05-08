import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// 進捗入力フォームの「紐づく目標」セレクト用に、対象生徒の未完了大目標と週次目標を返す。
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  let studentId = searchParams.get("studentId") || "";

  if (session.user.role === "student") {
    const student = await prisma.student.findFirst({ where: { userId: session.user.id } });
    if (!student) return NextResponse.json({ error: "No student record" }, { status: 400 });
    studentId = student.id;
  }

  if (!studentId) {
    return NextResponse.json({ error: "studentId is required" }, { status: 400 });
  }

  const [bigGoals, weeklyGoals] = await Promise.all([
    prisma.bigGoal.findMany({
      where: { studentId, status: { not: "completed" } },
      select: { id: true, subject: true, materialName: true },
      orderBy: { dueDate: "asc" },
    }),
    prisma.learningGoal.findMany({
      where: { studentId, status: { not: "completed" } },
      select: { id: true, subject: true, materialName: true, startDate: true, dueDate: true },
      orderBy: { dueDate: "asc" },
    }),
  ]);

  return NextResponse.json({
    bigGoals: bigGoals.map((g) => ({
      id: g.id,
      subject: g.subject,
      materialName: g.materialName,
    })),
    weeklyGoals: weeklyGoals.map((g) => ({
      id: g.id,
      subject: g.subject,
      materialName: g.materialName,
      startDate: g.startDate ? g.startDate.toISOString() : null,
      dueDate: g.dueDate.toISOString(),
    })),
  });
}
