import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { campus, studentId: overrideId } = await req.json();
  if (!campus) return NextResponse.json({ error: "campus required" }, { status: 400 });

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
  if (open.campus !== campus) {
    return NextResponse.json({
      error: `入室時と異なる校舎です（入室: ${open.campus}）`,
    }, { status: 400 });
  }

  const [updated] = await prisma.$transaction([
    prisma.studyRoomSession.update({
      where: { id: open.id },
      data: { checkOutAt: new Date(), pointAwarded: true },
    }),
    prisma.pointTransaction.create({
      data: { studentId: student.id, delta: 1, reason: "自習室退室" },
    }),
  ]);

  return NextResponse.json({ ok: true, sessionId: updated.id, pointAwarded: 1 });
}
