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
  const { subject, materialName, targetPages, startDate, dueDate, notes } = body;
  let studentId: string | undefined = body.studentId;

  // 生徒は自分の studentId を強制（body 値は無視）
  if (session.user.role === "student") {
    const student = await prisma.student.findFirst({ where: { userId: session.user.id } });
    if (!student) {
      return NextResponse.json({ error: "Student record not found" }, { status: 403 });
    }
    studentId = student.id;
  }

  if (!studentId || !subject || !materialName || !targetPages || !startDate || !dueDate) {
    return NextResponse.json({ error: "必須項目が不足しています" }, { status: 400 });
  }

  const bigGoal = await prisma.bigGoal.create({
    data: {
      studentId,
      subject,
      materialName,
      targetPages,
      startDate: new Date(startDate),
      dueDate: new Date(dueDate),
      status: "in_progress",
      notes: notes || "",
      createdById: session.user.id,
    },
  });

  return NextResponse.json(bigGoal, { status: 201 });
}
