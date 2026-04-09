import { requireAuth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import ClickableRow from "@/components/ClickableRow";

export default async function ProgressPage({
  searchParams,
}: {
  searchParams: Promise<{ subject?: string; studentName?: string }>;
}) {
  const session = await requireAuth();
  const params = await searchParams;
  const subjectFilter = params.subject || "";
  const studentNameFilter = params.studentName || "";

  const where: Record<string, unknown> = {};
  if (subjectFilter) where.subject = subjectFilter;

  if (session.user.role === "student") {
    const student = await prisma.student.findFirst({ where: { userId: session.user.id } });
    if (student) where.studentId = student.id;
  } else if (session.user.role === "teacher") {
    const teacher = await prisma.teacher.findFirst({ where: { userId: session.user.id } });
    if (teacher) where.teacherId = teacher.id;
  }

  if (studentNameFilter) {
    where.student = { user: { name: { contains: studentNameFilter } } };
  }

  const records = await prisma.progressRecord.findMany({
    where,
    include: {
      student: { include: { user: true } },
      teacher: { include: { user: true } },
      goal: true,
    },
    orderBy: { date: "desc" },
    take: 50,
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-dark">学習進捗一覧</h1>
        {session.user.role !== "student" && (
          <Link
            href="/progress/new"
            className="bg-primary text-white px-4 py-2 rounded-md text-sm hover:bg-primary-dark"
          >
            進捗入力
          </Link>
        )}
      </div>

      <form className="bg-white p-4 rounded-lg shadow mb-6 flex gap-4 flex-wrap">
        {session.user.role !== "student" && (
          <input
            name="studentName"
            defaultValue={studentNameFilter}
            placeholder="生徒名で検索（空欄=全生徒）"
            className="border border-gray-300 rounded-md px-3 py-2 text-sm w-64"
          />
        )}
        <select
          name="subject"
          defaultValue={subjectFilter}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm"
        >
          <option value="">全科目</option>
          <option value="数学">数学</option>
          <option value="英語">英語</option>
          <option value="国語">国語</option>
          <option value="物理">物理</option>
          <option value="化学">化学</option>
          <option value="生物">生物</option>
          <option value="日本史">日本史</option>
          <option value="世界史">世界史</option>
          <option value="地理">地理</option>
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
              <th className="px-6 py-3 text-left text-xs font-medium text-dark/60 uppercase">日付</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-dark/60 uppercase">生徒</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-dark/60 uppercase">科目</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-dark/60 uppercase">教材</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-dark/60 uppercase">学習内容</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-dark/60 uppercase">ページ数</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-dark/60 uppercase">講師</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {records.map((record) => (
              <ClickableRow key={record.id} href={`/progress/${record.id}`} className="hover:bg-surface">
                <td className="px-6 py-4 text-sm text-primary font-medium">
                  {new Date(record.date).toLocaleDateString("ja-JP")}
                </td>
                <td className="px-6 py-4 text-sm text-dark">{record.student.user.name}</td>
                <td className="px-6 py-4 text-sm text-dark">{record.subject}</td>
                <td className="px-6 py-4 text-sm text-dark">
                  {record.material}
                  {record.goal && (
                    <span className="ml-2 text-xs text-accent">[目標連携]</span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-dark max-w-xs">
                  <p className="line-clamp-2">{record.topic || "-"}</p>
                </td>
                <td className="px-6 py-4 text-sm text-dark">{record.pagesCompleted}ページ</td>
                <td className="px-6 py-4 text-sm text-dark">{record.teacher.user.name}</td>
              </ClickableRow>
            ))}
            {records.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-dark/60">
                  進捗記録がありません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
