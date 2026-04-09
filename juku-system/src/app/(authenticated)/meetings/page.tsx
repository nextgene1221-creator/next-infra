import { requireAuth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import ClickableRow from "@/components/ClickableRow";
import MeetingCreateButton from "@/components/MeetingCreateButton";

export default async function MeetingsPage({
  searchParams,
}: {
  searchParams: Promise<{ studentName?: string; type?: string }>;
}) {
  const session = await requireAuth(["admin", "teacher"]);
  const params = await searchParams;
  const studentNameFilter = params.studentName || "";
  const typeFilter = params.type || "";

  const where: Record<string, unknown> = {};
  if (studentNameFilter) {
    where.student = { user: { name: { contains: studentNameFilter } } };
  }
  if (typeFilter) where.type = typeFilter;

  // 講師は自分が記録した面談のみ
  if (session.user.role === "teacher") {
    const teacher = await prisma.teacher.findFirst({ where: { userId: session.user.id } });
    if (teacher) where.teacherId = teacher.id;
  }

  const meetings = await prisma.meeting.findMany({
    where,
    include: {
      student: { include: { user: true } },
      teacher: { include: { user: true } },
    },
    orderBy: { date: "desc" },
    take: 100,
  });

  // 新規作成モーダル用の生徒リスト
  const studentsList = await prisma.student.findMany({
    where: { status: "active" },
    include: { user: { select: { name: true } } },
    orderBy: { user: { name: "asc" } },
  });
  const studentOptions = studentsList.map((s) => ({ id: s.id, name: s.user.name }));

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-dark">面談管理</h1>
        <MeetingCreateButton students={studentOptions} currentUserName={session.user.name} />
      </div>

      <form className="bg-white p-4 rounded-lg shadow mb-6 flex gap-4 flex-wrap">
        <input
          name="studentName"
          defaultValue={studentNameFilter}
          placeholder="生徒名で検索（空欄=全生徒）"
          className="border border-gray-300 rounded-md px-3 py-2 text-sm w-64"
        />
        <select
          name="type"
          defaultValue={typeFilter}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm"
        >
          <option value="">全タイプ</option>
          <option value="定期面談">定期面談</option>
          <option value="進路相談">進路相談</option>
          <option value="学習相談">学習相談</option>
          <option value="保護者面談">保護者面談</option>
          <option value="その他">その他</option>
        </select>
        <button
          type="submit"
          className="bg-charcoal text-white px-4 py-2 rounded-md text-sm hover:bg-dark"
        >
          検索
        </button>
      </form>

      <p className="text-sm text-dark/60 mb-3">
        ※ 編集・削除は各生徒の詳細ページから行ってください
      </p>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-surface">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-dark/60 uppercase">面談日</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-dark/60 uppercase">生徒</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-dark/60 uppercase">タイプ</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-dark/60 uppercase">時間</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-dark/60 uppercase">内容</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-dark/60 uppercase">講師</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-dark/60 uppercase">次回予定</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {meetings.map((meeting) => (
              <ClickableRow
                key={meeting.id}
                href={`/students/${meeting.student.id}`}
                className="hover:bg-surface"
              >
                <td className="px-6 py-4 text-sm text-primary font-medium whitespace-nowrap">
                  {new Date(meeting.date).toLocaleDateString("ja-JP")}
                </td>
                <td className="px-6 py-4 text-sm text-dark whitespace-nowrap">
                  {meeting.student.user.name}
                </td>
                <td className="px-6 py-4 text-sm">
                  {meeting.type ? (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary-light text-primary font-medium">
                      {meeting.type}
                    </span>
                  ) : (
                    <span className="text-dark/40">-</span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-dark whitespace-nowrap">
                  {meeting.durationMinutes ? `${meeting.durationMinutes}分` : "-"}
                </td>
                <td className="px-6 py-4 text-sm text-dark max-w-md">
                  <p className="line-clamp-2">{meeting.content}</p>
                </td>
                <td className="px-6 py-4 text-sm text-dark whitespace-nowrap">
                  {meeting.teacher.user.name}
                </td>
                <td className="px-6 py-4 text-sm text-dark whitespace-nowrap">
                  {meeting.nextMeetingDate
                    ? new Date(meeting.nextMeetingDate).toLocaleDateString("ja-JP")
                    : "-"}
                </td>
              </ClickableRow>
            ))}
            {meetings.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-dark/60">
                  面談記録がありません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
