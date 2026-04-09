import { requireAuth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import ShiftCalendar from "./ShiftCalendar";

export default async function ShiftsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const session = await requireAuth(["admin", "teacher"]);
  const params = await searchParams;

  const now = new Date();
  const monthStr = params.month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [year, month] = monthStr.split("-").map(Number);
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);

  const where: Record<string, unknown> = {
    date: { gte: startDate, lte: endDate },
  };
  if (session.user.role === "teacher") {
    const teacher = await prisma.teacher.findFirst({ where: { userId: session.user.id } });
    if (teacher) where.teacherId = teacher.id;
  }

  const shifts = await prisma.shift.findMany({
    where,
    include: { teacher: { include: { user: true } } },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });

  const teachers = await prisma.teacher.findMany({
    where: { status: "active" },
    include: { user: true },
    orderBy: { user: { name: "asc" } },
  });

  const templatesRaw = await prisma.shiftTemplate.findMany({
    include: { teacher: { include: { user: true } } },
  });
  const templates = templatesRaw.map((t) => ({
    teacherId: t.teacherId,
    teacherName: t.teacher.user.name,
    weekdays: t.weekdays,
    startTime: t.startTime,
    endTime: t.endTime,
  }));

  const prevMonth = month === 1 ? `${year - 1}-12` : `${year}-${String(month - 1).padStart(2, "0")}`;
  const nextMonth = month === 12 ? `${year + 1}-01` : `${year}-${String(month + 1).padStart(2, "0")}`;

  const clientShifts = shifts.map((s) => ({
    id: s.id,
    teacherId: s.teacherId,
    date: s.date.toISOString(),
    startTime: s.startTime,
    endTime: s.endTime,
    status: s.status,
    notes: s.notes,
    teacher: { id: s.teacherId, user: { name: s.teacher.user.name } },
  }));
  const clientTeachers = teachers.map((t) => ({ id: t.id, name: t.user.name }));

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-dark">シフト管理</h1>
      </div>

      <div className="bg-white rounded-lg shadow p-4 mb-4 flex items-center justify-between">
        <Link href={`/shifts?month=${prevMonth}`} className="text-primary hover:underline text-sm">
          ← 前月
        </Link>
        <h2 className="text-lg font-semibold">
          {year}年{month}月
        </h2>
        <Link href={`/shifts?month=${nextMonth}`} className="text-primary hover:underline text-sm">
          翌月 →
        </Link>
      </div>

      <ShiftCalendar
        year={year}
        month={month}
        initialShifts={clientShifts}
        teachers={clientTeachers}
        templates={templates}
        isAdmin={session.user.role === "admin"}
      />
    </div>
  );
}
