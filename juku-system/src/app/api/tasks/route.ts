import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role === "student") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json();
  const { studentId, title, description, dueDate, type, meetingDateTime, teacherId: bodyTeacherId } = body;

  // admin が担当者を明示指定した場合はそれを使用、それ以外は自分の Teacher レコードに割当。
  // 講師でない場合は担当なし(null)。（以前は最初の講師=佐藤駿へ自動割当していたが廃止）
  let teacherId: string | null = null;
  if (session.user.role === "admin" && bodyTeacherId) {
    const t = await prisma.teacher.findUnique({ where: { id: bodyTeacherId } });
    if (t) teacherId = t.id;
  }
  if (!teacherId) {
    const self = await prisma.teacher.findFirst({ where: { userId: session.user.id } });
    teacherId = self?.id ?? null;
  }

  const task = await prisma.task.create({
    data: {
      studentId: studentId || null,
      teacherId,
      subject: "", // 科目は廃止
      title,
      description: description || "",
      dueDate: new Date(dueDate),
      type: type || "通常",
      meetingDateTime: meetingDateTime ? new Date(meetingDateTime) : null,
      status: "pending",
    },
  });

  return NextResponse.json(task, { status: 201 });
}
