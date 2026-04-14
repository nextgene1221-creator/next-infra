import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOrInitStudyRoomConfig } from "@/lib/studyRoom";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { campus, seatType, studentId: overrideId } = await req.json();
  if (!campus || !seatType) return NextResponse.json({ error: "campus/seatType required" }, { status: 400 });
  if (!["booth", "table"].includes(seatType)) {
    return NextResponse.json({ error: "seatType must be booth or table" }, { status: 400 });
  }

  let student;
  if (session.user.role === "student") {
    student = await prisma.student.findUnique({ where: { userId: session.user.id } });
  } else if (overrideId) {
    student = await prisma.student.findUnique({ where: { id: overrideId } });
  }
  if (!student) return NextResponse.json({ error: "生徒情報が見つかりません" }, { status: 400 });

  const open = await prisma.studyRoomSession.findFirst({
    where: { studentId: student.id, checkOutAt: null },
  });
  if (open) {
    return NextResponse.json({ error: "すでに入室中です", sessionId: open.id }, { status: 400 });
  }

  const config = await getOrInitStudyRoomConfig(campus);
  const capacity = seatType === "booth" ? config.boothCapacity : config.tableCapacity;
  const occupied = await prisma.studyRoomSession.count({
    where: { campus, seatType, checkOutAt: null },
  });
  if (occupied >= capacity) {
    return NextResponse.json({ error: `${seatType === "booth" ? "ブース席" : "テーブル席"}が満席です（${occupied}/${capacity}）` }, { status: 400 });
  }

  const created = await prisma.studyRoomSession.create({
    data: { studentId: student.id, campus, seatType, checkInAt: new Date() },
  });
  return NextResponse.json({ ok: true, sessionId: created.id });
}
