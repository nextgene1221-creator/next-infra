import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const attendance = await prisma.attendance.findUnique({
    where: { id },
    include: { teacher: true },
  });
  if (!attendance) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isAdmin = session.user.role === "admin";
  const isOwner = attendance.teacher.userId === session.user.id;
  if (!isAdmin && !isOwner) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { clockIn, clockOut } = body as { clockIn?: string; clockOut?: string | null };

  const data: { clockIn?: Date; clockOut?: Date | null } = {};
  if (clockIn) {
    const inDate = new Date(clockIn);
    if (Number.isNaN(inDate.getTime())) {
      return NextResponse.json({ error: "Invalid clockIn" }, { status: 400 });
    }
    data.clockIn = inDate;
  }
  if (clockOut === null) {
    data.clockOut = null;
  } else if (clockOut) {
    const outDate = new Date(clockOut);
    if (Number.isNaN(outDate.getTime())) {
      return NextResponse.json({ error: "Invalid clockOut" }, { status: 400 });
    }
    data.clockOut = outDate;
  }

  const finalIn = data.clockIn ?? attendance.clockIn;
  const finalOut = data.clockOut === undefined ? attendance.clockOut : data.clockOut;
  if (finalOut && finalOut <= finalIn) {
    return NextResponse.json(
      { error: "退勤時刻は出勤時刻より後である必要があります" },
      { status: 400 },
    );
  }

  const updated = await prisma.attendance.update({ where: { id }, data });
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const attendance = await prisma.attendance.findUnique({
    where: { id },
    include: { teacher: true },
  });
  if (!attendance) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isAdmin = session.user.role === "admin";
  const isOwner = attendance.teacher.userId === session.user.id;
  if (!isAdmin && !isOwner) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.attendance.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
