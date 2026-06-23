import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/class-days?studentId=xxx -> その生徒の授業日一覧
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const studentId = req.nextUrl.searchParams.get("studentId");
  if (!studentId) {
    return NextResponse.json({ error: "studentId is required" }, { status: 400 });
  }

  // 生徒本人は自分のぶんのみ閲覧可
  if (session.user.role === "student") {
    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student || student.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const days = await prisma.classDay.findMany({
    where: { studentId },
    include: { teacher: { include: { user: { select: { name: true } } } } },
    orderBy: { date: "asc" },
  });
  return NextResponse.json(days);
}

// POST /api/class-days -> 授業日を作成（admin / teacher のみ）
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role === "student") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { studentId, date, subject, teacherId, startTime, endTime, note } = body;

  if (!studentId || !date) {
    return NextResponse.json({ error: "必須項目が不足しています" }, { status: 400 });
  }

  const created = await prisma.classDay.create({
    data: {
      studentId,
      date: new Date(date),
      subject: subject || "",
      teacherId: teacherId || null,
      startTime: startTime || "",
      endTime: endTime || "",
      note: note || "",
    },
    include: { teacher: { include: { user: { select: { name: true } } } } },
  });

  return NextResponse.json(created, { status: 201 });
}
