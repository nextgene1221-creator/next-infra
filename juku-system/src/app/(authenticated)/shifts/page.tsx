import { requireAuth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import ShiftCalendar from "./ShiftCalendar";
import AttendanceButton from "@/components/AttendanceButton";

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
  let currentTeacherId: string | undefined;
  if (session.user.role === "teacher") {
    const teacher = await prisma.teacher.findFirst({ where: { userId: session.user.id } });
    if (teacher) {
      where.teacherId = teacher.id;
      currentTeacherId = teacher.id;
    }
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

  const templatesRaw = await prisma.teacher.findMany({
    where: { status: "active" },
    include: {
      user: true,
      shiftTemplateDays: { orderBy: { weekday: "asc" } },
    },
    orderBy: { user: { name: "asc" } },
  });
  const templates = templatesRaw
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

  const defaultCampus = await prisma.campus.findFirst({ orderBy: { sortOrder: "asc" } });
  const defaultEndTime = defaultCampus?.closeTime || "21:00";

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

  // 講師ロール用: 自身の出退勤履歴（同じ month を共有）
  let attendanceRows: {
    dateLabel: string;
    weekday: string;
    shiftLabel: string;
    inHM: string;
    outHM: string;
    diffLabel: string;
    diffColor: string;
    workMinutes: number | null;
  }[] = [];
  let attendanceSummary = { workDays: 0, totalMinutes: 0, diffDays: 0, noShowDays: 0 };
  if (session.user.role === "teacher" && currentTeacherId) {
    const myAttendances = await prisma.attendance.findMany({
      where: { teacherId: currentTeacherId, clockIn: { gte: startDate, lte: endDate } },
      orderBy: { clockIn: "asc" },
    });
    const weekdayLabels = ["日", "月", "火", "水", "木", "金", "土"];
    const daysInMonth = endDate.getDate();
    for (let day = 1; day <= daysInMonth; day++) {
      const dayDate = new Date(year, month - 1, day);
      const dayStart = new Date(dayDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayDate);
      dayEnd.setHours(23, 59, 59, 999);

      const dayShifts = shifts.filter((s) => {
        const sd = new Date(s.date);
        return sd >= dayStart && sd <= dayEnd;
      });
      const dayAttendances = myAttendances.filter((a) => {
        const ad = new Date(a.clockIn);
        return ad >= dayStart && ad <= dayEnd;
      });

      if (dayAttendances.length === 0 && dayShifts.length === 0) continue;

      const dateLabel = `${month}/${day}`;
      const weekday = weekdayLabels[dayDate.getDay()];
      const shiftLabel = dayShifts.map((s) => `${s.startTime}-${s.endTime}`).join(", ") || "-";

      if (dayAttendances.length === 0) {
        attendanceSummary.noShowDays++;
        attendanceRows.push({
          dateLabel,
          weekday,
          shiftLabel,
          inHM: "-",
          outHM: "-",
          diffLabel: "未打刻",
          diffColor: "text-red-500",
          workMinutes: null,
        });
        continue;
      }

      for (const a of dayAttendances) {
        const inDate = new Date(a.clockIn);
        const inHM = inDate.toTimeString().slice(0, 5);
        const outDate = a.clockOut ? new Date(a.clockOut) : null;
        const outHM = outDate ? outDate.toTimeString().slice(0, 5) : "勤務中";

        let workMinutes: number | null = null;
        if (outDate) {
          workMinutes = Math.round((outDate.getTime() - inDate.getTime()) / 60000);
          attendanceSummary.totalMinutes += workMinutes;
        }

        let diffLabel = "-";
        let diffColor = "text-dark/60";
        const matchedShift = dayShifts[0];
        if (matchedShift) {
          const inDiff = inHM !== matchedShift.startTime;
          const outDiff = outDate && outHM !== matchedShift.endTime;
          if (!outDate) {
            diffLabel = "勤務中";
            diffColor = "text-blue-600";
          } else if (inDiff || outDiff) {
            diffLabel = "差異あり";
            diffColor = "text-yellow-600";
            attendanceSummary.diffDays++;
          } else {
            diffLabel = "一致";
            diffColor = "text-green-600";
          }
        } else {
          diffLabel = "シフトなし";
          diffColor = "text-red-500";
        }

        attendanceRows.push({ dateLabel, weekday, shiftLabel, inHM, outHM, diffLabel, diffColor, workMinutes });
      }
      attendanceSummary.workDays++;
    }
  }
  const attTotalH = Math.floor(attendanceSummary.totalMinutes / 60);
  const attTotalM = attendanceSummary.totalMinutes % 60;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-dark">シフト管理</h1>
      </div>

      {session.user.role === "teacher" && (
        <div className="mb-4">
          <AttendanceButton />
        </div>
      )}

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
        defaultEndTime={defaultEndTime}
        isAdmin={session.user.role === "admin"}
        currentTeacherId={currentTeacherId}
      />

      {session.user.role === "teacher" && currentTeacherId && (
        <div className="bg-white rounded-lg shadow overflow-x-auto mt-6">
          <div className="bg-surface px-6 py-3 border-b">
            <h2 className="font-medium text-dark">{year}年{month}月の出退勤履歴</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 border-b">
            <div>
              <p className="text-xs text-dark/60">出勤日数</p>
              <p className="text-xl font-bold text-dark">{attendanceSummary.workDays}日</p>
            </div>
            <div>
              <p className="text-xs text-dark/60">合計勤務時間</p>
              <p className="text-xl font-bold text-dark">
                {attTotalH}h{attTotalM > 0 ? ` ${attTotalM}m` : ""}
              </p>
            </div>
            <div>
              <p className="text-xs text-dark/60">差異あり</p>
              <p className="text-xl font-bold text-yellow-600">{attendanceSummary.diffDays}件</p>
            </div>
            <div>
              <p className="text-xs text-dark/60">未打刻日</p>
              <p className="text-xl font-bold text-red-500">{attendanceSummary.noShowDays}日</p>
            </div>
          </div>
          {attendanceRows.length === 0 ? (
            <p className="text-dark/60 text-sm p-6">この月の出退勤・シフト記録がありません</p>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-surface">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-dark/60 uppercase">日付</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-dark/60 uppercase">シフト予定</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-dark/60 uppercase">出勤</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-dark/60 uppercase">退勤</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-dark/60 uppercase">勤務時間</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-dark/60 uppercase">差異</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {attendanceRows.map((r, idx) => (
                  <tr key={idx}>
                    <td className="px-6 py-3 text-sm text-dark whitespace-nowrap">
                      {r.dateLabel}
                      <span className={`ml-1 text-xs ${r.weekday === "日" ? "text-red-500" : r.weekday === "土" ? "text-blue-500" : "text-dark/60"}`}>
                        ({r.weekday})
                      </span>
                    </td>
                    <td className="px-6 py-3 text-sm text-dark/60">{r.shiftLabel}</td>
                    <td className="px-6 py-3 text-sm font-medium">{r.inHM}</td>
                    <td className="px-6 py-3 text-sm font-medium">{r.outHM}</td>
                    <td className="px-6 py-3 text-sm text-dark/60">
                      {r.workMinutes !== null
                        ? `${Math.floor(r.workMinutes / 60)}h${r.workMinutes % 60 > 0 ? ` ${r.workMinutes % 60}m` : ""}`
                        : "-"}
                    </td>
                    <td className={`px-6 py-3 text-sm font-medium ${r.diffColor}`}>{r.diffLabel}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
