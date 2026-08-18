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

// POST: プリント予定を登録（生徒自身 or 講師/admin）。連番運用のため、登録は「最小空き No」のみ許可。
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

  // 連番強制は廃止: 1..printCount の範囲なら任意のNoを登録/再登録可能
  const printUnit = await prisma.printUnit.findUnique({ where: { id: printUnitId } });
  if (!printUnit) {
    return NextResponse.json({ error: "単元が見つかりません" }, { status: 404 });
  }
  const targetNo = Number(printNo);
  if (!Number.isInteger(targetNo) || targetNo < 1 || targetNo > printUnit.printCount) {
    return NextResponse.json(
      { error: `プリントNoは 1〜${printUnit.printCount} の範囲で指定してください` },
      { status: 400 },
    );
  }

  const print = await prisma.studentPrint.upsert({
    where: {
      studentId_printUnitId_printNo: { studentId, printUnitId, printNo: targetNo },
    },
    create: {
      studentId,
      printUnitId,
      printNo: targetNo,
      scheduledDate: new Date(scheduledDate),
    },
    update: {
      scheduledDate: new Date(scheduledDate),
    },
  });
  return NextResponse.json(print);
}

// PUT: プリント完了日 or 予定日を更新
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { id, completedDate, scheduledDate } = body;
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const existing = await prisma.studentPrint.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data: { completedDate?: Date | null; scheduledDate?: Date } = {};

  if (completedDate !== undefined) {
    // 完了の取り消し（null 化）は講師・管理者のみ（B-4 (a)、オーナー確認 2026-08-18）。
    if (!completedDate && session.user.role === "student") {
      return NextResponse.json({ error: "完了の取り消しは講師・運営のみ可能です" }, { status: 403 });
    }
    // 生徒は自分のプリントのみ完了操作できる（他生徒の記録を触らせない）。
    if (session.user.role === "student") {
      const student = await prisma.student.findFirst({ where: { userId: session.user.id } });
      if (!student || student.id !== existing.studentId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
    data.completedDate = completedDate ? new Date(completedDate) : null;
  }

  if (scheduledDate !== undefined) {
    if (existing.completedDate) {
      return NextResponse.json({ error: "完了済みのプリントは予定日を変更できません" }, { status: 400 });
    }

    if (session.user.role === "student") {
      const student = await prisma.student.findFirst({ where: { userId: session.user.id } });
      if (!student || student.id !== existing.studentId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const oldDate = new Date(existing.scheduledDate);
      oldDate.setHours(0, 0, 0, 0);
      const newDate = new Date(scheduledDate);
      newDate.setHours(0, 0, 0, 0);
      if (oldDate.getTime() < today.getTime() || newDate.getTime() < today.getTime()) {
        return NextResponse.json({ error: "過去の予定日は変更できません" }, { status: 403 });
      }
    }

    data.scheduledDate = new Date(scheduledDate);
  }

  const print = await prisma.studentPrint.update({ where: { id }, data });
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
