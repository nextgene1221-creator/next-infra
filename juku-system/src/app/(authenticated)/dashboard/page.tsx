import { requireAuth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import EventCalendar from "@/components/EventCalendar";

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
    const teacher = await prisma.teacher.findFirst({ where: { userId } });
    if (teacher) {
      const [taskCount, shiftCount] = await Promise.all([
        prisma.task.count({
          where: { teacherId: teacher.id, status: { in: ["pending", "in_progress"] } },
        }),
        prisma.shift.count({
          where: { teacherId: teacher.id, date: { gte: new Date() }, status: "scheduled" },
        }),
      ]);
      stats = [
        { label: "未完了タスク", value: taskCount, href: "/tasks" },
        { label: "今後のシフト", value: shiftCount, href: "/shifts" },
      ];
    }
  } else {
    const student = await prisma.student.findFirst({ where: { userId } });
    if (student) {
      const progressCount = await prisma.progressRecord.count({ where: { studentId: student.id } });
      stats = [
        { label: "進捗記録数", value: progressCount, href: "/progress" },
      ];
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

      {showCalendar && (
        <div className="mb-6">
          <EventCalendar schools={schools} events={calendarEvents} />
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-dark mb-4">
          未読アラート
        </h2>
        {alerts.length === 0 ? (
          <p className="text-charcoal/70">未読のアラートはありません</p>
        ) : (
          <ul className="space-y-3">
            {alerts.map((alert) => (
              <li
                key={alert.id}
                className="flex items-start space-x-3 p-3 bg-primary-light border border-primary/20 rounded-md"
              >
                <div>
                  <p className="font-medium text-dark">{alert.title}</p>
                  <p className="text-sm text-charcoal">{alert.message}</p>
                  <p className="text-xs text-dark/50 mt-1">
                    {new Date(alert.createdAt).toLocaleString("ja-JP")}
                  </p>
                </div>
              </li>
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
    </div>
  );
}
