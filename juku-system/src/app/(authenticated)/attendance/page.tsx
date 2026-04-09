import { requireAuth } from "@/lib/session";
import { prisma } from "@/lib/prisma";

type DayRow = {
  dateLabel: string;
  weekday: string;
  shiftLabel: string;
  inHM: string;
  outHM: string;
  diffLabel: string;
  diffColor: string;
  workMinutes: number | null;
};

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; date?: string; month?: string; teacherId?: string }>;
}) {
  await requireAuth(["admin"]);
  const params = await searchParams;
  const view = params.view === "day" ? "day" : "month";

  const teachers = await prisma.teacher.findMany({
    where: { status: "active" },
    include: { user: true },
    orderBy: { user: { name: "asc" } },
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-dark">出退勤管理</h1>
        <div className="flex gap-2">
          <a
            href="/attendance?view=day"
            className={`px-4 py-2 rounded-md text-sm ${
              view === "day"
                ? "bg-primary text-white"
                : "bg-white text-charcoal border border-gray-300 hover:bg-surface"
            }`}
          >
            日単位
          </a>
          <a
            href="/attendance?view=month"
            className={`px-4 py-2 rounded-md text-sm ${
              view === "month"
                ? "bg-primary text-white"
                : "bg-white text-charcoal border border-gray-300 hover:bg-surface"
            }`}
          >
            月単位
          </a>
        </div>
      </div>

      {view === "day" ? (
        <DayView dateParam={params.date} />
      ) : (
        <MonthView
          monthParam={params.month}
          teacherIdParam={params.teacherId}
          teachers={teachers}
        />
      )}
    </div>
  );
}

// ====================
// 日単位ビュー
// ====================
async function DayView({ dateParam }: { dateParam?: string }) {
  const todayStr = new Date().toISOString().split("T")[0];
  const dateStr = dateParam || todayStr;
  const date = new Date(dateStr);
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  const attendances = await prisma.attendance.findMany({
    where: { clockIn: { gte: dayStart, lte: dayEnd } },
    include: { teacher: { include: { user: true, shifts: true } } },
    orderBy: { clockIn: "asc" },
  });

  const rows = attendances.map((a) => {
    const inHM = new Date(a.clockIn).toTimeString().slice(0, 5);
    const outHM = a.clockOut ? new Date(a.clockOut).toTimeString().slice(0, 5) : null;
    const todayShift = a.teacher.shifts.find((s) => {
      const sd = new Date(s.date);
      return sd >= dayStart && sd <= dayEnd;
    });
    return { attendance: a, shift: todayShift, inHM, outHM };
  });

  const allTodayShifts = await prisma.shift.findMany({
    where: { date: { gte: dayStart, lte: dayEnd } },
    include: { teacher: { include: { user: true } } },
  });
  const punchedTeacherIds = new Set(attendances.map((a) => a.teacherId));
  const noShowShifts = allTodayShifts.filter((s) => !punchedTeacherIds.has(s.teacherId));

  return (
    <>
      <form className="bg-white p-4 rounded-lg shadow mb-6 flex gap-4 items-center">
        <input type="hidden" name="view" value="day" />
        <label className="text-sm text-charcoal">日付:</label>
        <input
          type="date"
          name="date"
          defaultValue={dateStr}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="bg-charcoal text-white px-4 py-2 rounded-md text-sm hover:bg-dark"
        >
          検索
        </button>
      </form>

      <div className="bg-white rounded-lg shadow overflow-x-auto mb-6">
        <div className="bg-surface px-6 py-3 border-b">
          <h2 className="font-medium text-dark">打刻記録</h2>
        </div>
        {rows.length === 0 ? (
          <p className="text-dark/60 text-sm p-6">打刻記録がありません</p>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-surface">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-dark/60 uppercase">講師</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-dark/60 uppercase">出勤</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-dark/60 uppercase">退勤</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-dark/60 uppercase">シフト予定</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-dark/60 uppercase">差異</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {rows.map(({ attendance: a, shift, inHM, outHM }) => {
                let diff = "-";
                let diffColor = "text-dark/60";
                if (shift) {
                  const inDiff = inHM !== shift.startTime;
                  const outDiff = outHM && outHM !== shift.endTime;
                  if (inDiff || outDiff) {
                    diff = "差異あり";
                    diffColor = "text-yellow-600";
                  } else if (!outHM) {
                    diff = "勤務中";
                    diffColor = "text-blue-600";
                  } else {
                    diff = "一致";
                    diffColor = "text-green-600";
                  }
                } else {
                  diff = "シフトなし";
                  diffColor = "text-red-500";
                }
                return (
                  <tr key={a.id}>
                    <td className="px-6 py-4 text-sm text-dark">{a.teacher.user.name}</td>
                    <td className="px-6 py-4 text-sm font-medium">{inHM}</td>
                    <td className="px-6 py-4 text-sm font-medium">{outHM || "勤務中"}</td>
                    <td className="px-6 py-4 text-sm text-dark/60">
                      {shift ? `${shift.startTime} - ${shift.endTime}` : "-"}
                    </td>
                    <td className={`px-6 py-4 text-sm font-medium ${diffColor}`}>{diff}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {noShowShifts.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <div className="bg-red-50 px-6 py-3 border-b border-red-200">
            <h2 className="font-medium text-red-700">未打刻のシフト</h2>
          </div>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-surface">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-dark/60 uppercase">講師</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-dark/60 uppercase">シフト時間</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {noShowShifts.map((s) => (
                <tr key={s.id}>
                  <td className="px-6 py-4 text-sm text-dark">{s.teacher.user.name}</td>
                  <td className="px-6 py-4 text-sm text-dark/60">
                    {s.startTime} - {s.endTime}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

// ====================
// 月単位ビュー
// ====================
async function MonthView({
  monthParam,
  teacherIdParam,
  teachers,
}: {
  monthParam?: string;
  teacherIdParam?: string;
  teachers: { id: string; user: { name: string } }[];
}) {
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthStr = monthParam || defaultMonth;
  const teacherId = teacherIdParam || "";

  const [year, month] = monthStr.split("-").map(Number);
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);
  const daysInMonth = monthEnd.getDate();

  const prevMonth = month === 1 ? `${year - 1}-12` : `${year}-${String(month - 1).padStart(2, "0")}`;
  const nextMonth = month === 12 ? `${year + 1}-01` : `${year}-${String(month + 1).padStart(2, "0")}`;

  let rows: DayRow[] = [];
  let teacherName = "";
  let summary = { workDays: 0, totalMinutes: 0, diffDays: 0, noShowDays: 0 };

  if (teacherId) {
    const teacher = teachers.find((t) => t.id === teacherId);
    teacherName = teacher?.user.name || "";

    const attendances = await prisma.attendance.findMany({
      where: {
        teacherId,
        clockIn: { gte: monthStart, lte: monthEnd },
      },
      orderBy: { clockIn: "asc" },
    });
    const shifts = await prisma.shift.findMany({
      where: {
        teacherId,
        date: { gte: monthStart, lte: monthEnd },
      },
      orderBy: { date: "asc" },
    });

    const weekdayLabels = ["日", "月", "火", "水", "木", "金", "土"];

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
      const dayAttendances = attendances.filter((a) => {
        const ad = new Date(a.clockIn);
        return ad >= dayStart && ad <= dayEnd;
      });

      const dateLabel = `${month}/${day}`;
      const weekday = weekdayLabels[dayDate.getDay()];
      const shiftLabel = dayShifts
        .map((s) => `${s.startTime}-${s.endTime}`)
        .join(", ") || "-";

      if (dayAttendances.length === 0 && dayShifts.length === 0) {
        // 空き日（休み）はスキップ
        continue;
      }

      if (dayAttendances.length === 0) {
        // シフトはあるが未打刻
        summary.noShowDays++;
        rows.push({
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

      // 1日に複数の打刻がある可能性
      for (const a of dayAttendances) {
        const inDate = new Date(a.clockIn);
        const inHM = inDate.toTimeString().slice(0, 5);
        const outDate = a.clockOut ? new Date(a.clockOut) : null;
        const outHM = outDate ? outDate.toTimeString().slice(0, 5) : "勤務中";

        let workMinutes: number | null = null;
        if (outDate) {
          workMinutes = Math.round((outDate.getTime() - inDate.getTime()) / 60000);
          summary.totalMinutes += workMinutes;
        }

        let diffLabel = "-";
        let diffColor = "text-dark/60";
        const matchedShift = dayShifts[0]; // 同日の最初のシフトと比較
        if (matchedShift) {
          const inDiff = inHM !== matchedShift.startTime;
          const outDiff = outDate && outHM !== matchedShift.endTime;
          if (!outDate) {
            diffLabel = "勤務中";
            diffColor = "text-blue-600";
          } else if (inDiff || outDiff) {
            diffLabel = "差異あり";
            diffColor = "text-yellow-600";
            summary.diffDays++;
          } else {
            diffLabel = "一致";
            diffColor = "text-green-600";
          }
        } else {
          diffLabel = "シフトなし";
          diffColor = "text-red-500";
        }

        rows.push({
          dateLabel,
          weekday,
          shiftLabel,
          inHM,
          outHM,
          diffLabel,
          diffColor,
          workMinutes,
        });
      }
      summary.workDays++;
    }
  }

  const totalHours = Math.floor(summary.totalMinutes / 60);
  const totalMin = summary.totalMinutes % 60;

  return (
    <>
      <form className="bg-white p-4 rounded-lg shadow mb-6 flex gap-4 flex-wrap items-center">
        <input type="hidden" name="view" value="month" />
        <label className="text-sm text-charcoal">講師:</label>
        <select
          name="teacherId"
          defaultValue={teacherId}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm"
        >
          <option value="">選択してください</option>
          {teachers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.user.name}
            </option>
          ))}
        </select>
        <label className="text-sm text-charcoal">月:</label>
        <input
          type="month"
          name="month"
          defaultValue={monthStr}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="bg-charcoal text-white px-4 py-2 rounded-md text-sm hover:bg-dark"
        >
          表示
        </button>
      </form>

      {!teacherId ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-dark/60">
          講師を選択してください
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <div className="bg-surface px-6 py-3 border-b flex items-center justify-between">
              <a
                href={`/attendance?view=month&teacherId=${teacherId}&month=${prevMonth}`}
                className="text-sm text-primary hover:underline"
              >
                ← 前月
              </a>
              <h2 className="font-medium text-dark">
                {teacherName} - {year}年{month}月
              </h2>
              <a
                href={`/attendance?view=month&teacherId=${teacherId}&month=${nextMonth}`}
                className="text-sm text-primary hover:underline"
              >
                翌月 →
              </a>
            </div>

            {/* サマリ */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 border-b">
              <div>
                <p className="text-xs text-dark/60">出勤日数</p>
                <p className="text-xl font-bold text-dark">{summary.workDays}日</p>
              </div>
              <div>
                <p className="text-xs text-dark/60">合計勤務時間</p>
                <p className="text-xl font-bold text-dark">
                  {totalHours}h{totalMin > 0 ? ` ${totalMin}m` : ""}
                </p>
              </div>
              <div>
                <p className="text-xs text-dark/60">差異あり</p>
                <p className="text-xl font-bold text-yellow-600">{summary.diffDays}件</p>
              </div>
              <div>
                <p className="text-xs text-dark/60">未打刻日</p>
                <p className="text-xl font-bold text-red-500">{summary.noShowDays}日</p>
              </div>
            </div>

            {rows.length === 0 ? (
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
                  {rows.map((r, idx) => (
                    <tr key={idx}>
                      <td className="px-6 py-3 text-sm text-dark whitespace-nowrap">
                        {r.dateLabel}
                        <span
                          className={`ml-1 text-xs ${
                            r.weekday === "日"
                              ? "text-red-500"
                              : r.weekday === "土"
                              ? "text-blue-500"
                              : "text-dark/60"
                          }`}
                        >
                          ({r.weekday})
                        </span>
                      </td>
                      <td className="px-6 py-3 text-sm text-dark/60">{r.shiftLabel}</td>
                      <td className="px-6 py-3 text-sm font-medium">{r.inHM}</td>
                      <td className="px-6 py-3 text-sm font-medium">{r.outHM}</td>
                      <td className="px-6 py-3 text-sm text-dark/60">
                        {r.workMinutes !== null
                          ? `${Math.floor(r.workMinutes / 60)}h${
                              r.workMinutes % 60 > 0 ? ` ${r.workMinutes % 60}m` : ""
                            }`
                          : "-"}
                      </td>
                      <td className={`px-6 py-3 text-sm font-medium ${r.diffColor}`}>
                        {r.diffLabel}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </>
  );
}
