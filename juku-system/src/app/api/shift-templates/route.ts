import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type DayInput = { weekday: number; startTime: string; endTime: string };

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

function validDays(days: unknown): days is DayInput[] {
  if (!Array.isArray(days)) return false;
  const seen = new Set<number>();
  for (const d of days) {
    if (!d || typeof d !== "object") return false;
    const { weekday, startTime, endTime } = d as DayInput;
    if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) return false;
    if (seen.has(weekday)) return false;
    seen.add(weekday);
    if (typeof startTime !== "string" || !HHMM.test(startTime)) return false;
    if (typeof endTime !== "string" || !HHMM.test(endTime)) return false;
    if (startTime >= endTime) return false;
  }
  return true;
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role === "student") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const teacherId = searchParams.get("teacherId");

  if (teacherId) {
    const days = await prisma.shiftTemplateDay.findMany({
      where: { teacherId },
      orderBy: { weekday: "asc" },
    });
    return NextResponse.json(days);
  }

  // 講師ごとにまとめて返す
  const teachers = await prisma.teacher.findMany({
    include: {
      user: true,
      shiftTemplateDays: { orderBy: { weekday: "asc" } },
    },
    orderBy: { user: { name: "asc" } },
  });

  const templates = teachers
    .filter((t) => t.shiftTemplateDays.length > 0)
    .map((t) => ({
      teacherId: t.id,
      teacherName: t.user.name,
      days: t.shiftTemplateDays.map((d) => ({
        weekday: d.weekday,
        startTime: d.startTime,
        endTime: d.endTime,
      })),
    }));

  return NextResponse.json(templates);
}

// 講師の週次テンプレートを「曜日ごとの配列」で置き換える
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json();
  const { teacherId, days } = body as { teacherId?: string; days?: unknown };

  if (!teacherId || typeof teacherId !== "string") {
    return NextResponse.json({ error: "teacherId is required" }, { status: 400 });
  }
  if (!validDays(days)) {
    return NextResponse.json({ error: "invalid days payload" }, { status: 400 });
  }

  const teacher = await prisma.teacher.findUnique({ where: { id: teacherId } });
  if (!teacher) {
    return NextResponse.json({ error: "teacher not found" }, { status: 404 });
  }

  await prisma.$transaction([
    prisma.shiftTemplateDay.deleteMany({ where: { teacherId } }),
    ...(days.length > 0
      ? [
          prisma.shiftTemplateDay.createMany({
            data: days.map((d) => ({
              teacherId,
              weekday: d.weekday,
              startTime: d.startTime,
              endTime: d.endTime,
            })),
          }),
        ]
      : []),
  ]);

  const saved = await prisma.shiftTemplateDay.findMany({
    where: { teacherId },
    orderBy: { weekday: "asc" },
  });
  return NextResponse.json(saved);
}
