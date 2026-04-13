import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function canAccess(studentId: string) {
  const session = await getServerSession(authOptions);
  if (!session) return { ok: false as const, status: 401 };
  if (session.user.role === "admin" || session.user.role === "teacher") return { ok: true as const };
  if (session.user.role === "student") {
    const s = await prisma.student.findUnique({ where: { id: studentId } });
    if (s && s.userId === session.user.id) return { ok: true as const };
  }
  return { ok: false as const, status: 403 };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const a = await canAccess(id);
  if (!a.ok) return NextResponse.json({ error: "Unauthorized" }, { status: a.status });

  const days = await prisma.studyScheduleDay.findMany({
    where: { studentId: id },
    orderBy: { weekday: "asc" },
  });
  return NextResponse.json(days);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const a = await canAccess(id);
  if (!a.ok) return NextResponse.json({ error: "Unauthorized" }, { status: a.status });

  const body = await req.json();
  const schedule = body.schedule as { weekday: number; hours: number }[];
  if (!Array.isArray(schedule)) {
    return NextResponse.json({ error: "schedule must be array" }, { status: 400 });
  }

  await prisma.$transaction(
    schedule.map((s) =>
      prisma.studyScheduleDay.upsert({
        where: { studentId_weekday: { studentId: id, weekday: s.weekday } },
        create: { studentId: id, weekday: s.weekday, hours: s.hours },
        update: { hours: s.hours },
      })
    )
  );

  const days = await prisma.studyScheduleDay.findMany({
    where: { studentId: id },
    orderBy: { weekday: "asc" },
  });
  return NextResponse.json(days);
}
