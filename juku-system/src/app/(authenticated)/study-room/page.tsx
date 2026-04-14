import { requireAuth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { CAMPUSES, STUDY_ROOM_CAPACITY, campusLabel } from "@/lib/studyRoom";
import StudyRoomAdmin from "./StudyRoomAdmin";

export default async function StudyRoomPage() {
  await requireAuth(["admin", "teacher"]);

  const [openSessions, recentHistory, students] = await Promise.all([
    prisma.studyRoomSession.findMany({
      where: { checkOutAt: null },
      include: { student: { include: { user: true } } },
      orderBy: { checkInAt: "asc" },
    }),
    prisma.studyRoomSession.findMany({
      where: { checkOutAt: { not: null } },
      include: { student: { include: { user: true } } },
      orderBy: { checkInAt: "desc" },
      take: 50,
    }),
    prisma.student.findMany({
      where: { status: "active" },
      include: {
        user: true,
        pointTransactions: true,
      },
      orderBy: { user: { name: "asc" } },
    }),
  ]);

  const occupancy = Object.fromEntries(
    CAMPUSES.map((c) => [
      c.value,
      openSessions.filter((s) => s.campus === c.value).length,
    ])
  );

  const studentsWithPoints = students.map((s) => ({
    id: s.id,
    name: s.user.name,
    schoolName: s.schoolName,
    points: s.pointTransactions.reduce((sum, t) => sum + t.delta, 0),
  }));

  return (
    <div>
      <h1 className="text-2xl font-bold text-dark mb-6">自習室管理</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {CAMPUSES.map((c) => (
          <div key={c.value} className="bg-white rounded-lg shadow p-4">
            <div className="flex justify-between items-baseline">
              <h2 className="text-lg font-semibold">{c.label}</h2>
              <span className="text-sm text-dark/60">
                <span className="text-2xl font-bold text-primary">{occupancy[c.value] || 0}</span>
                {" "}/ {STUDY_ROOM_CAPACITY} 席
              </span>
            </div>
            <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full"
                style={{ width: `${Math.min(100, ((occupancy[c.value] || 0) / STUDY_ROOM_CAPACITY) * 100)}%` }}
              />
            </div>
            <ul className="mt-3 divide-y divide-gray-100 text-sm">
              {openSessions.filter((s) => s.campus === c.value).map((s) => (
                <li key={s.id} className="py-1 flex justify-between">
                  <span>{s.student.user.name}</span>
                  <span className="text-xs text-dark/60">
                    入室 {new Date(s.checkInAt).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </li>
              ))}
              {openSessions.filter((s) => s.campus === c.value).length === 0 && (
                <li className="py-1 text-xs text-dark/50">入室者なし</li>
              )}
            </ul>
          </div>
        ))}
      </div>

      <StudyRoomAdmin
        studentsWithPoints={studentsWithPoints}
        history={recentHistory.map((s) => ({
          id: s.id,
          studentName: s.student.user.name,
          campus: s.campus,
          campusLabel: campusLabel(s.campus),
          checkInAt: s.checkInAt.toISOString(),
          checkOutAt: s.checkOutAt!.toISOString(),
          autoCheckedOut: s.autoCheckedOut,
          pointAwarded: s.pointAwarded,
        }))}
      />
    </div>
  );
}
