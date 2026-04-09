import { requireAuth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";
import RoutineTaskManager from "@/components/RoutineTaskManager";
import ShiftTemplateForm from "@/components/ShiftTemplateForm";

export default async function TeacherDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAuth(["admin"]);
  const { id } = await params;

  const teacher = await prisma.teacher.findUnique({
    where: { id },
    include: {
      user: true,
      shifts: { orderBy: { date: "desc" }, take: 10 },
      routineTasks: {
        include: { student: { include: { user: true } } },
        orderBy: { createdAt: "desc" },
      },
      attendances: {
        orderBy: { clockIn: "desc" },
        take: 20,
      },
      shiftTemplate: true,
    },
  });

  if (!teacher) notFound();

  const subjects = JSON.parse(teacher.subjects) as string[];

  // 出退勤履歴とシフトの照合
  const attendanceWithShift = teacher.attendances.map((a) => {
    const day = new Date(a.clockIn);
    const dayStart = new Date(day);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(day);
    dayEnd.setHours(23, 59, 59, 999);
    const matchingShift = teacher.shifts.find((s) => {
      const sd = new Date(s.date);
      return sd >= dayStart && sd <= dayEnd;
    });
    return { attendance: a, shift: matchingShift };
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-dark">{teacher.user.name}</h1>
        <Link
          href={`/teachers/${id}/edit`}
          className="bg-primary text-white px-4 py-2 rounded-md text-sm hover:bg-primary-dark"
        >
          編集
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">基本情報</h2>
          <dl className="space-y-3">
            <div className="flex">
              <dt className="w-32 text-sm text-dark/60">メール</dt>
              <dd className="text-sm text-dark">{teacher.user.email}</dd>
            </div>
            <div className="flex">
              <dt className="w-32 text-sm text-dark/60">電話番号</dt>
              <dd className="text-sm text-dark">{teacher.phone}</dd>
            </div>
            <div className="flex">
              <dt className="w-32 text-sm text-dark/60">担当科目</dt>
              <dd className="text-sm text-dark">{subjects.join(", ")}</dd>
            </div>
            <div className="flex">
              <dt className="w-32 text-sm text-dark/60">雇用形態</dt>
              <dd className="text-sm text-dark">
                {teacher.employmentType === "full_time" ? "常勤" : "非常勤"}
              </dd>
            </div>
            <div className="flex">
              <dt className="w-32 text-sm text-dark/60">ステータス</dt>
              <dd className="text-sm text-dark">
                {teacher.status === "active" ? "稼働中" : "非稼働"}
              </dd>
            </div>
          </dl>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">最近のシフト</h2>
          {teacher.shifts.length === 0 ? (
            <p className="text-dark/60 text-sm">シフトがありません</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-dark/60">日付</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-dark/60">時間</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-dark/60">ステータス</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {teacher.shifts.map((shift) => (
                    <tr key={shift.id}>
                      <td className="px-4 py-2 text-sm">
                        {new Date(shift.date).toLocaleDateString("ja-JP")}
                      </td>
                      <td className="px-4 py-2 text-sm">
                        {shift.startTime} - {shift.endTime}
                      </td>
                      <td className="px-4 py-2 text-sm">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            shift.status === "confirmed"
                              ? "bg-green-100 text-green-800"
                              : shift.status === "cancelled"
                              ? "bg-red-100 text-red-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {shift.status === "scheduled"
                            ? "予定"
                            : shift.status === "confirmed"
                            ? "確定"
                            : "キャンセル"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 出退勤履歴とシフトの照合 */}
        <div className="bg-white rounded-lg shadow p-6 lg:col-span-2">
          <h2 className="text-lg font-semibold mb-4">出退勤履歴</h2>
          {attendanceWithShift.length === 0 ? (
            <p className="text-dark/60 text-sm">出退勤履歴がありません</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-surface">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-dark/60 uppercase">日付</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-dark/60 uppercase">出勤</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-dark/60 uppercase">退勤</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-dark/60 uppercase">シフト予定</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-dark/60 uppercase">差異</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {attendanceWithShift.map(({ attendance: a, shift }) => {
                    const inTime = new Date(a.clockIn);
                    const outTime = a.clockOut ? new Date(a.clockOut) : null;
                    const inHM = inTime.toTimeString().slice(0, 5);
                    const outHM = outTime ? outTime.toTimeString().slice(0, 5) : "-";

                    let diff = "-";
                    let diffColor = "text-dark/60";
                    if (shift) {
                      const inDiff = inHM !== shift.startTime;
                      const outDiff = outHM !== "-" && outHM !== shift.endTime;
                      if (inDiff || outDiff) {
                        diff = `予定: ${shift.startTime}-${shift.endTime}`;
                        diffColor = "text-yellow-600";
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
                        <td className="px-4 py-2 text-sm">
                          {inTime.toLocaleDateString("ja-JP")}
                        </td>
                        <td className="px-4 py-2 text-sm font-medium">{inHM}</td>
                        <td className="px-4 py-2 text-sm font-medium">{outHM}</td>
                        <td className="px-4 py-2 text-sm text-dark/60">
                          {shift ? `${shift.startTime} - ${shift.endTime}` : "-"}
                        </td>
                        <td className={`px-4 py-2 text-xs ${diffColor}`}>{diff}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 週次シフトテンプレート */}
        <div className="bg-white rounded-lg shadow p-6 lg:col-span-2">
          <h2 className="text-lg font-semibold mb-4">週次シフトテンプレート</h2>
          <p className="text-xs text-dark/60 mb-3">
            ※ ここで設定した曜日・時間は、シフト管理ページの「一括生成」で月単位のシフトに展開されます
          </p>
          <ShiftTemplateForm
            teacherId={id}
            initialTemplate={
              teacher.shiftTemplate
                ? {
                    weekdays: teacher.shiftTemplate.weekdays,
                    startTime: teacher.shiftTemplate.startTime,
                    endTime: teacher.shiftTemplate.endTime,
                  }
                : null
            }
          />
        </div>

        {/* ルーティンタスク */}
        <div className="bg-white rounded-lg shadow p-6 lg:col-span-2">
          <RoutineTaskManager teacherId={id} initialRoutines={teacher.routineTasks} />
        </div>
      </div>
    </div>
  );
}
