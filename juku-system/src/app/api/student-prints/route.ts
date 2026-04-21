import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET: 生徒のプリント一覧取得
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const studentId = searchParams.get("studentId");
  const scheduledDate = searchParams.get("scheduledDate"); // YYYY-MM-DD

  const where: Record<string, unknown> = {};
  if (studentId) where.studentId = studentId;
  if (scheduledDate) {
    const d = new Date(scheduledDate);
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
    where.scheduledDate = { gte: start, lte: end };
  }

  const prints = await prisma.studentPrint.findMany({
    where,
    include: {
      printUnit: true,
      student: { include: { user: { select: { name: true } } } },
    },
    orderBy: [{ printUnit: { subject: "asc" } }, { printUnit: { name: "asc" } }, { printNo: "asc" }],
  });
  return NextResponse.json(prints);
}

// POST: プリント予定を登録（生徒自身 or 講師/admin）
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { studentId, printUnitId, printNo, scheduledDate } = body;

  // 生徒は自分のみ
  if (session.user.role === "student") {
    const student = await prisma.student.findFirst({ where: { userId: session.user.id } });
    if (!student || student.id !== studentId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const print = await prisma.studentPrint.upsert({
    where: {
      studentId_printUnitId_printNo: { studentId, printUnitId, printNo: Number(printNo) },
    },
    create: {
      studentId,
      printUnitId,
      printNo: Number(printNo),
      scheduledDate: new Date(scheduledDate),
    },
    update: {
      scheduledDate: new Date(scheduledDate),
    },
  });
  return NextResponse.json(print);
}

// PUT: プリント完了日を登録
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, completedDate } = await req.json();
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const print = await prisma.studentPrint.update({
    where: { id },
    data: { completedDate: completedDate ? new Date(completedDate) : null },
  });
  return NextResponse.json(print);
}

// DELETE: プリント予定を削除
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  await prisma.studentPrint.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
