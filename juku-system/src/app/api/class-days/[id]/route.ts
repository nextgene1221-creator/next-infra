import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PUT /api/class-days/[id] -> 授業日を更新（admin / teacher のみ）
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role === "student") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const { date, subject, teacherId, startTime, endTime, note } = body;

  const updated = await prisma.classDay.update({
    where: { id },
    data: {
      date: date ? new Date(date) : undefined,
      subject: subject === undefined ? undefined : subject || "",
      teacherId: teacherId === undefined ? undefined : teacherId || null,
      startTime: startTime === undefined ? undefined : startTime || "",
      endTime: endTime === undefined ? undefined : endTime || "",
      note: note === undefined ? undefined : note || "",
    },
    include: { teacher: { include: { user: { select: { name: true } } } } },
  });

  return NextResponse.json(updated);
}

// DELETE /api/class-days/[id] -> 授業日を削除（admin / teacher のみ）
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role === "student") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  await prisma.classDay.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
