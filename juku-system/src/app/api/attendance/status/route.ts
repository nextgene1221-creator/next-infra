import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const teacher = await prisma.teacher.findFirst({ where: { userId: session.user.id } });
  if (!teacher) {
    return NextResponse.json({ isTeacher: false });
  }

  const active = await prisma.attendance.findFirst({
    where: { teacherId: teacher.id, clockOut: null },
    orderBy: { clockIn: "desc" },
  });

  return NextResponse.json({ isTeacher: true, clockedIn: !!active, clockInAt: active?.clockIn || null });
}
