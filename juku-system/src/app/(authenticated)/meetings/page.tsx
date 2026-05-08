import { requireAuth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import MeetingsListClient, { type MeetingListItem } from "./MeetingsListClient";

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

  const items: MeetingListItem[] = meetings.map((m) => ({
    id: m.id,
    studentId: m.student.id,
    studentName: m.student.user.name,
    date: m.date.toISOString(),
    durationMinutes: m.durationMinutes,
    type: m.type,
    status: m.status,
    content: m.content,
    parentComment: m.parentComment,
    goalsSnapshot: m.goalsSnapshot,
    progressSnapshot: m.progressSnapshot,
    nextMeetingDate: m.nextMeetingDate ? m.nextMeetingDate.toISOString() : null,
    teacherName: m.teacher.user.name,
  }));

  return (
    <div>
      <h1 className="text-2xl font-bold text-dark mb-6">面談管理</h1>

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

      <MeetingsListClient initialMeetings={items} />
    </div>
  );
}
