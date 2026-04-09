import { requireAuth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import ClickableRow from "@/components/ClickableRow";

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; graduationYear?: string }>;
}) {
  const session = await requireAuth(["admin", "teacher"]);
  const params = await searchParams;
  const q = params.q || "";
  const statusFilter = params.status || "";
  const yearFilter = params.graduationYear || "";

  const where: Record<string, unknown> = {};

  if (statusFilter) where.status = statusFilter;
  if (yearFilter) where.graduationYear = parseInt(yearFilter);

  const students = await prisma.student.findMany({
    where: {
      ...where,
      ...(q ? { user: { name: { contains: q } } } : {}),
    },
    include: { user: true },
    orderBy: { createdAt: "desc" },
  });

  // フィルタ用の卒業年度リストを生成（現在年から+3年）
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear + i);

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
              <th className="px-6 py-3 text-left text-xs font-medium text-dark/60 uppercase">名前</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-dark/60 uppercase">卒業年度</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-dark/60 uppercase">高校名</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-dark/60 uppercase">ステータス</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-dark/60 uppercase">入塾日</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {students.map((student) => (
              <ClickableRow key={student.id} href={`/students/${student.id}`} className="hover:bg-surface">
                <td className="px-6 py-4 text-sm text-primary font-medium">
                  {student.user.name}
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
            {students.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-dark/60">
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
