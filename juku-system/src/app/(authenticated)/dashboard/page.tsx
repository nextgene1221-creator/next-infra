import { requireAuth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import EventCalendar from "@/components/EventCalendar";
import DashboardAlertItem from "@/components/DashboardAlertItem";
import TeacherTaskList from "@/components/TeacherTaskList";
import { computeTodayPlan, type WeeklyGoalLite } from "@/lib/todayPlan";
import { getAllCampuses, getAllStudyRoomConfigs } from "@/lib/studyRoom";

export default async function DashboardPage() {
  const session = await requireAuth();
  const role = session.user.role;
  const userId = session.user.id;

  const alerts = await prisma.alert.findMany({
    where: { userId, isRead: false },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  let stats: { label: string; value: number; href: string }[] = [];

  if (role === "admin") {
    const [studentCount, teacherCount, taskCount, shiftCount] = await Promise.all([
      prisma.student.count({ where: { status: "active" } }),
      prisma.teacher.count({ where: { status: "active" } }),
      prisma.task.count({ where: { status: { in: ["pending", "in_progress"] } } }),
      prisma.shift.count({
        where: { date: { gte: new Date() }, status: "scheduled" },
      }),
    ]);
    stats = [
      { label: "在籍生徒数", value: studentCount, href: "/students" },
      { label: "講師数", value: teacherCount, href: "/teachers" },
      { label: "未完了タスク", value: taskCount, href: "/tasks" },
      { label: "今後のシフト", value: shiftCount, href: "/shifts" },
    ];
  } else if (role === "teacher") {
    // 講師ダッシュボードは下部で個別表示するため、stats は出さない
  }

  // 生徒: 今日のページ数プラン + 大目標/週次目標
  let todayPlan: ReturnType<typeof computeTodayPlan> = [];
  let scheduleConfigured = true;
  let studentBigGoals: {
    id: string;
    subject: string;
    materialName: string;
    targetPages: number;
    done: number;
    startDate: Date;
    dueDate: Date;
  }[] = [];
  let studentWeeklyGoals: {
    id: string;
    subject: string;
    materialName: string;
    targetPages: number;
    done: number;
    dueDate: Date;
  }[] = [];
  if (role === "student") {
    const student = await prisma.student.findFirst({
      where: { userId },
      include: {
        studySchedule: true,
        learningGoals: {
          where: { status: { not: "completed" } },
          include: { progressRecords: { select: { pagesCompleted: true } } },
        },
      },
    });
    if (student) {
      const sched: number[] = Array(7).fill(0);
      for (const s of student.studySchedule) sched[s.weekday] = s.hours;
      scheduleConfigured = sched.some((h) => h > 0);
      const goals: WeeklyGoalLite[] = student.learningGoals.map((g) => ({
        id: g.id,
        subject: g.subject,
        materialName: g.materialName,
        targetPages: g.targetPages,
        startDate: g.startDate,
        dueDate: g.dueDate,
        status: g.status,
        done: g.progressRecords.reduce((s, r) => s + r.pagesCompleted, 0),
      }));
      todayPlan = computeTodayPlan(goals, sched);

      studentWeeklyGoals = student.learningGoals.map((g) => ({
        id: g.id,
        subject: g.subject,
        materialName: g.materialName,
        targetPages: g.targetPages,
        done: g.progressRecords.reduce((s, r) => s + r.pagesCompleted, 0),
        dueDate: g.dueDate,
      }));

      const bigGoals = await prisma.bigGoal.findMany({
        where: { studentId: student.id, status: { not: "completed" } },
        include: {
          weeklyGoals: { include: { progressRecords: { select: { pagesCompleted: true } } } },
        },
        orderBy: { dueDate: "asc" },
      });
      studentBigGoals = bigGoals.map((b) => ({
        id: b.id,
        subject: b.subject,
        materialName: b.materialName,
        targetPages: b.targetPages,
        done: b.weeklyGoals.reduce(
          (sum, w) => sum + w.progressRecords.reduce((s, r) => s + r.pagesCompleted, 0),
          0
        ),
        startDate: b.startDate,
        dueDate: b.dueDate,
      }));
    }
  }

  // 講師: 未完了タスク一覧と今後1週間のシフト
  let teacherTasks: {
    id: string;
    title: string;
    studentId: string | null;
    teacherId: string;
    subject: string;
    description: string;
    dueDate: string;
    type: string;
    meetingDateTime: string | null;
  }[] = [];
  let teacherShifts: { id: string; date: Date; startTime: string; endTime: string }[] = [];
  if (role === "teacher") {
    const teacher = await prisma.teacher.findFirst({ where: { userId } });
    if (teacher) {
      const now = new Date();
      const weekLater = new Date(now);
      weekLater.setDate(weekLater.getDate() + 7);
      const [tasksRaw, shiftsRaw] = await Promise.all([
        prisma.task.findMany({
          where: { teacherId: teacher.id, status: { in: ["pending", "in_progress"] } },
          orderBy: { dueDate: "asc" },
          take: 20,
        }),
        prisma.shift.findMany({
          where: {
            teacherId: teacher.id,
            date: { gte: now, lte: weekLater },
            status: { not: "cancelled" },
          },
          orderBy: [{ date: "asc" }, { startTime: "asc" }],
        }),
      ]);
      teacherTasks = tasksRaw.map((t) => ({
        id: t.id,
        title: t.title,
        studentId: t.studentId,
        teacherId: t.teacherId,
        subject: t.subject,
        description: t.description,
        dueDate: t.dueDate.toISOString(),
        type: t.type,
        meetingDateTime: t.meetingDateTime ? t.meetingDateTime.toISOString() : null,
      }));
      teacherShifts = shiftsRaw.map((s) => ({
        id: s.id,
        date: s.date,
        startTime: s.startTime,
        endTime: s.endTime,
      }));
    }
  }

  // 自習室の空席状況（全ロール向け）
  const [openSessions, configs, campuses] = await Promise.all([
    prisma.studyRoomSession.findMany({
      where: { checkOutAt: null },
      select: { campus: true, seatType: true },
    }),
    getAllStudyRoomConfigs(),
    getAllCampuses(),
  ]);
  const occupancy = campuses.map((c) => {
    const cfg = configs.find((x) => x.campus === c.code);
    return {
      code: c.code,
      label: c.label,
      booth: openSessions.filter((s) => s.campus === c.code && s.seatType === "booth").length,
      table: openSessions.filter((s) => s.campus === c.code && s.seatType === "table").length,
      boothCap: cfg?.boothCapacity ?? 0,
      tableCap: cfg?.tableCapacity ?? 0,
    };
  });
  const campusLabelMap = Object.fromEntries(campuses.map((c) => [c.code, c.label]));

  // 生徒の現在状態・ポイント
  let studentPoints = 0;
  let studentInRoom: { campus: string; checkInAt: Date } | null = null;
  if (role === "student") {
    const s = await prisma.student.findUnique({
      where: { userId },
      include: {
        pointTransactions: true,
        studyRoomSessions: { where: { checkOutAt: null }, take: 1 },
      },
    });
    if (s) {
      studentPoints = s.pointTransactions.reduce((sum, t) => sum + t.delta, 0);
      if (s.studyRoomSessions[0]) {
        studentInRoom = {
          campus: s.studyRoomSessions[0].campus,
          checkInAt: s.studyRoomSessions[0].checkInAt,
        };
      }
    }
  }

  const showCalendar = role === "admin" || role === "teacher";
  const [schools, eventsRaw] = showCalendar
    ? await Promise.all([
        prisma.school.findMany({ orderBy: { name: "asc" } }),
        prisma.schoolEvent.findMany({ include: { school: true }, orderBy: { startDate: "asc" } }),
      ])
    : [[], []];
  const calendarEvents = eventsRaw.map((e) => ({
    id: e.id,
    schoolId: e.schoolId,
    schoolName: e.school.name,
    title: e.title,
    startDate: e.startDate.toISOString(),
    endDate: e.endDate ? e.endDate.toISOString() : null,
    eventType: e.eventType,
  }));

  return (
    <div>
      <h1 className="text-2xl font-bold text-dark mb-6">ダッシュボード</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow"
          >
            <p className="text-sm text-charcoal/70">{stat.label}</p>
            <p className="text-3xl font-bold text-dark mt-1">{stat.value}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {occupancy.map((o) => (
          <div key={o.code} className="bg-white rounded-lg shadow p-4">
            <p className="text-xs text-dark/60">🪑 自習室 {o.label}</p>
            <div className="mt-2 space-y-2">
              <SeatRow label="ブース席" used={o.booth} cap={o.boothCap} />
              <SeatRow label="テーブル席" used={o.table} cap={o.tableCap} />
            </div>
          </div>
        ))}
        {role === "student" && (
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-xs text-dark/60">🍬 獲得ポイント</p>
            <p className="mt-1">
              <span className="text-3xl font-bold text-accent">{studentPoints}</span>
              <span className="text-sm text-dark/60"> P</span>
            </p>
            {studentInRoom && (
              <p className="text-xs text-green-600 mt-2">
                {campusLabelMap[studentInRoom.campus] || studentInRoom.campus} に入室中
                <br />
                <span className="text-dark/60">
                  {new Date(studentInRoom.checkInAt).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}〜
                </span>
              </p>
            )}
          </div>
        )}
      </div>

      {role === "student" && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-dark mb-2">📚 今日進めるページ</h2>
          {!scheduleConfigured ? (
            <p className="text-sm text-dark/70">
              学習スケジュールが未設定です。
              <Link href="/study-schedule" className="text-primary hover:underline ml-1">設定する →</Link>
            </p>
          ) : todayPlan.length === 0 ? (
            <p className="text-sm text-dark/70">本日対象の週次目標はありません</p>
          ) : (
            <ul className="divide-y divide-gray-200">
              {todayPlan.map((it) => (
                <li key={it.goalId} className="py-2 flex justify-between items-center gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-dark truncate">[{it.subject}] {it.materialName}</div>
                    <div className="text-xs text-dark/60">
                      残り {it.remainingPages}p / 期日 {it.dueDate.toLocaleDateString("ja-JP")} / 残り学習 {it.remainingHours}時間
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    {it.reason ? (
                      <span className="text-xs text-orange-600">{it.reason}</span>
                    ) : (
                      <span className="text-lg font-bold text-primary">{it.todayPages}<span className="text-xs ml-0.5">ページ</span></span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {role === "student" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-dark mb-4">🎯 大目標</h2>
            {studentBigGoals.length === 0 ? (
              <p className="text-sm text-dark/60">大目標は登録されていません</p>
            ) : (
              <ul className="divide-y divide-gray-200">
                {studentBigGoals.map((g) => {
                  const pct = g.targetPages > 0 ? Math.min(100, Math.round((g.done / g.targetPages) * 100)) : 0;
                  return (
                    <li key={g.id} className="py-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-dark font-medium">[{g.subject}] {g.materialName}</span>
                        <span className="text-dark/70">{g.done}/{g.targetPages}p</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                        <div className="bg-primary h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="text-xs text-dark/60 mt-1">
                        期日 {g.dueDate.toLocaleDateString("ja-JP")}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-dark mb-4">📅 週次目標</h2>
            {studentWeeklyGoals.length === 0 ? (
              <p className="text-sm text-dark/60">週次目標はありません</p>
            ) : (
              <ul className="divide-y divide-gray-200">
                {studentWeeklyGoals.map((g) => {
                  const pct = g.targetPages > 0 ? Math.min(100, Math.round((g.done / g.targetPages) * 100)) : 0;
                  return (
                    <li key={g.id} className="py-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-dark font-medium">[{g.subject}] {g.materialName}</span>
                        <span className="text-dark/70">{g.done}/{g.targetPages}p</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                        <div className="bg-accent h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="text-xs text-dark/60 mt-1">
                        期日 {g.dueDate.toLocaleDateString("ja-JP")}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}

      {role === "teacher" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-dark mb-4">未完了タスク</h2>
            <TeacherTaskList tasks={teacherTasks} />
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-dark mb-4">今後1週間のシフト</h2>
            {teacherShifts.length === 0 ? (
              <p className="text-sm text-dark/60">予定されたシフトはありません</p>
            ) : (
              <ul className="divide-y divide-gray-200">
                {teacherShifts.map((s) => (
                  <li key={s.id} className="py-2 text-sm text-dark flex justify-between">
                    <span>
                      {new Date(s.date).toLocaleDateString("ja-JP", {
                        month: "numeric",
                        day: "numeric",
                        weekday: "short",
                      })}
                    </span>
                    <span className="text-dark/70">
                      {s.startTime} 〜 {s.endTime}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-dark mb-4">
          未読アラート
        </h2>
        {alerts.length === 0 ? (
          <p className="text-charcoal/70">未読のアラートはありません</p>
        ) : (
          <ul className="space-y-3">
            {alerts.map((alert) => (
              <DashboardAlertItem
                key={alert.id}
                id={alert.id}
                title={alert.title}
                message={alert.message}
                createdAt={alert.createdAt.toISOString()}
              />
            ))}
          </ul>
        )}
        {alerts.length > 0 && (
          <Link
            href="/alerts"
            className="mt-4 inline-block text-sm text-primary hover:underline"
          >
            全てのアラートを見る
          </Link>
        )}
      </div>

      {showCalendar && (
        <div className="mb-6">
          <EventCalendar schools={schools} events={calendarEvents} />
        </div>
      )}
    </div>
  );
}

function SeatRow({ label, used, cap }: { label: string; used: number; cap: number }) {
  const pct = cap > 0 ? Math.min(100, (used / cap) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-xs">
        <span className="text-dark/70">{label}</span>
        <span>
          <span className="font-bold text-primary">{used}</span>
          <span className="text-dark/60">/{cap}</span>
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-1.5 mt-0.5">
        <div className="bg-primary h-1.5 rounded-full" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
