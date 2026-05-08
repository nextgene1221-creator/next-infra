import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function ensureStudentCanModify(
  goalId: string,
  userId: string,
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const goal = await prisma.learningGoal.findUnique({ where: { id: goalId } });
  if (!goal) return { ok: false, status: 404, error: "Not found" };
  const student = await prisma.student.findFirst({ where: { userId } });
  if (!student || goal.studentId !== student.id) {
    return { ok: false, status: 403, error: "Forbidden" };
  }
  if (goal.createdById !== userId) {
    return { ok: false, status: 403, error: "他のユーザーが作成した目標は編集・削除できません" };
  }
  return { ok: true };
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  if (session.user.role === "student") {
    const check = await ensureStudentCanModify(id, session.user.id);
    if (!check.ok) {
      return NextResponse.json({ error: check.error }, { status: check.status });
    }
  }

  const body = await req.json();
  const { bigGoalId, subject, materialName, targetPages, startDate, dueDate, notes, status } = body;

  const goal = await prisma.learningGoal.update({
    where: { id },
    data: {
      bigGoalId: bigGoalId === undefined ? undefined : bigGoalId || null,
      subject,
      materialName,
      targetPages,
      startDate: startDate ? new Date(startDate) : null,
      dueDate: new Date(dueDate),
      status: status || "in_progress",
      notes: notes || "",
    },
  });

  return NextResponse.json(goal);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  if (session.user.role === "student") {
    const check = await ensureStudentCanModify(id, session.user.id);
    if (!check.ok) {
      return NextResponse.json({ error: check.error }, { status: check.status });
    }
  }

  await prisma.progressRecord.updateMany({
    where: { goalId: id },
    data: { goalId: null },
  });

  await prisma.learningGoal.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
