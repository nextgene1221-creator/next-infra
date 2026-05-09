// 入室中の生徒の席種を変更する（同セッション継続）
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOrInitStudyRoomConfig } from "@/lib/studyRoom";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { newSeatType, studentId: overrideId } = await req.json();
  if (!newSeatType || !["booth", "table"].includes(newSeatType)) {
    return NextResponse.json({ error: "newSeatType must be booth or table" }, { status: 400 });
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
  if (!open) {
    return NextResponse.json({ error: "入室記録がありません" }, { status: 400 });
  }

  if (open.seatType === newSeatType) {
    return NextResponse.json({ error: "既に同じ席種で入室しています" }, { status: 400 });
  }

  // 移動先の席種に空きがあるか
  const config = await getOrInitStudyRoomConfig(open.campus);
  const capacity = newSeatType === "booth" ? config.boothCapacity : config.tableCapacity;
  const occupied = await prisma.studyRoomSession.count({
    where: { campus: open.campus, seatType: newSeatType, checkOutAt: null },
  });
  if (occupied >= capacity) {
    return NextResponse.json(
      { error: `${newSeatType === "booth" ? "ブース席" : "テーブル席"}が満席です（${occupied}/${capacity}）` },
      { status: 400 },
    );
  }

  const updated = await prisma.studyRoomSession.update({
    where: { id: open.id },
    data: { seatType: newSeatType },
  });
  return NextResponse.json({ ok: true, sessionId: updated.id, newSeatType: updated.seatType });
}
