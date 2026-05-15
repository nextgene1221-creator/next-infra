import { requireAuth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import ClickableRow from "@/components/ClickableRow";
import { computeStudentAlerts } from "@/lib/studentAlerts";
import { SUBJECTS } from "@/lib/types";

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    graduationYear?: string;
    teacherId?: string;
    subject?: string;
    sort?: string;
  }>;
}) {
  const session = await requireAuth(["admin", "teacher"]);
  const params = await searchParams;
  const q = params.q || "";
  const statusFilter = params.status || "";
  const yearFilter = params.graduationYear || "";
  const teacherFilter = params.teacherId || "";
  const subjectFilter = params.subject || "";
  const sortKey = params.sort || "";

  const where: Record<string, unknown> = {};

  if (statusFilter) where.status = statusFilter;
  if (yearFilter) where.graduationYear = parseInt(yearFilter);
  if (teacherFilter) {
    where.assignments = { some: { teacherId: teacherFilter } };
  }
  if (subjectFilter) {
    where.examSubjects = { contains: `"${subjectFilter}"` };
  }

  const students = await prisma.student.findMany({
    where: {
      ...where,
      ...(q ? { user: { name: { contains: q } } } : {}),
    },
    include: {
      user: true,
      assignments: {
        include: { teacher: { include: { user: { select: { name: true } } } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const teachers = await prisma.teacher.findMany({
    where: { status: "active" },
    include: { user: { select: { name: true } } },
    orderBy: { user: { name: "asc" } },
  });

  const alerts = await computeStudentAlerts(students.map((s) => s.id));

  // 優先度: both(3) > paceOnly(2) > meetingOnly(2) > none(0)、active 生徒のみアラート対象
  const ranked = students.map((s) => {
    const a = alerts.get(s.id);
    const isActive = s.status === "active";
    const meetingGap = !!(isActive && a?.meetingGap);
    const paceAlert = !!(isActive && a?.paceAlert);
    const both = meetingGap && paceAlert;
    const priority = both ? 3 : meetingGap || paceAlert ? 2 : 0;
    const teacherNames = s.assignments
      .map((x) => x.teacher.user.name)
      .sort((x, y) => x.localeCompare(y, "ja"));
    return { student: s, meetingGap, paceAlert, both, priority, teacherNames };
  });

  const sortByName = (a: { student: { user: { name: string } } }, b: { student: { user: { name: string } } }) =>
    a.student.user.name.localeCompare(b.student.user.name, "ja");
  const sortByTeacher = (
    a: { teacherNames: string[] },
    b: { teacherNames: string[] },
  ) => {
    const ax = a.teacherNames[0] || "￿";
    const bx = b.teacherNames[0] || "￿";
    return ax.localeCompare(bx, "ja");
  };

  if (sortKey === "name") {
    ranked.sort(sortByName);
  } else if (sortKey === "teacher") {
    ranked.sort((a, b) => {
      const tcmp = sortByTeacher(a, b);
      if (tcmp !== 0) return tcmp;
      return sortByName(a, b);
    });
  } else if (sortKey === "enrollment") {
    ranked.sort(
      (a, b) =>
        new Date(b.student.enrollmentDate).getTime() -
        new Date(a.student.enrollmentDate).getTime(),
    );
  } else {
    // デフォルト: アラート優先度順
    ranked.sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      return new Date(b.student.createdAt).getTime() - new Date(a.student.createdAt).getTime();
    });
  }

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear + i);

  const rowClass = (both: boolean, meeting: boolean, pace: boolean) => {
    if (both) return "bg-red-50 hover:bg-red-100";
    if (meeting) return "bg-yellow-50 hover:bg-yellow-100";
    if (pace) return "bg-orange-50 hover:bg-orange-100";
    return "hover:bg-surface";
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-dark">生徒一覧</h1>
        {session.user.role === "admin" && (
          <Link
            href="/students/new/edit"
            className="bg-primary text-white px-4 py-2 rounded-md text-sm hover:bg-primary-dark"
          >
            新規登録
          </Link>
        )}
      </div>

      <div className="bg-white p-3 rounded-lg shadow mb-4 flex gap-4 flex-wrap text-xs text-dark/70">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-200 inline-block" />💬 面談が2週間以上空いている</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-200 inline-block" />🐢 学習が遅れている</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-200 inline-block" />🚨 両方該当</span>
      </div>

      <form className="bg-white p-4 rounded-lg shadow mb-6 flex gap-4 flex-wrap">
        <input
          name="q"
          defaultValue={q}
          placeholder="名前で検索"
          className="border border-gray-300 rounded-md px-3 py-2 text-sm"
        />
        <select
          name="status"
          defaultValue={statusFilter}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm"
        >
          <option value="">全ステータス</option>
          <option value="active">在籍</option>
          <option value="inactive">休塾</option>
          <option value="withdrawn">退塾</option>
        </select>
        <select
          name="graduationYear"
          defaultValue={yearFilter}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm"
        >
          <option value="">全卒業年度</option>
          {yearOptions.map((y) => (
            <option key={y} value={y}>
              {y}年度卒
            </option>
          ))}
        </select>
        <select
          name="teacherId"
          defaultValue={teacherFilter}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm"
        >
          <option value="">全担当講師</option>
          {teachers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.user.name}
            </option>
          ))}
        </select>
        <select
          name="subject"
          defaultValue={subjectFilter}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm"
        >
          <option value="">全科目</option>
          {SUBJECTS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          name="sort"
          defaultValue={sortKey}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm"
        >
          <option value="">アラート優先順</option>
          <option value="teacher">担当講師順</option>
          <option value="name">名前順</option>
          <option value="enrollment">入塾日順</option>
        </select>
        <button
          type="submit"
          className="bg-charcoal text-white px-4 py-2 rounded-md text-sm hover:bg-dark"
        >
          検索
        </button>
      </form>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-surface">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-dark/60 uppercase">状態</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-dark/60 uppercase">名前</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-dark/60 uppercase">担当講師</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-dark/60 uppercase">卒業年度</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-dark/60 uppercase">高校名</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-dark/60 uppercase">ステータス</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-dark/60 uppercase">入塾日</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {ranked.map(({ student, meetingGap, paceAlert, both, teacherNames }) => (
              <ClickableRow
                key={student.id}
                href={`/students/${student.id}`}
                className={rowClass(both, meetingGap, paceAlert)}
              >
                <td className="px-6 py-4 text-lg" title={
                  both ? "面談が2週間以上空いており、学習も遅れています"
                  : meetingGap ? "面談が2週間以上空いています"
                  : paceAlert ? "学習が遅れています"
                  : ""
                }>
                  {both ? "🚨" : meetingGap ? "💬" : paceAlert ? "🐢" : ""}
                </td>
                <td className={`px-6 py-4 text-sm font-medium ${both ? "text-red-700" : meetingGap ? "text-yellow-800" : paceAlert ? "text-orange-800" : "text-primary"}`}>
                  {student.user.name}
                </td>
                <td className="px-6 py-4 text-sm text-dark/70">
                  {teacherNames.length === 0 ? <span className="text-dark/40">-</span> : teacherNames.join("、")}
                </td>
                <td className="px-6 py-4 text-sm text-dark">{student.graduationYear}年度卒</td>
                <td className="px-6 py-4 text-sm text-dark">{student.schoolName}</td>
                <td className="px-6 py-4 text-sm">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      student.status === "active"
                        ? "bg-green-100 text-green-800"
                        : student.status === "inactive"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {student.status === "active" ? "在籍" : student.status === "inactive" ? "休塾" : "退塾"}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-dark">
                  {new Date(student.enrollmentDate).toLocaleDateString("ja-JP")}
                </td>
              </ClickableRow>
            ))}
            {ranked.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-dark/60">
                  生徒が見つかりません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
