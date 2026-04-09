import { requireAuth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import ClickableRow from "@/components/ClickableRow";

export default async function TeachersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  await requireAuth(["admin"]);
  const params = await searchParams;
  const q = params.q || "";
  const statusFilter = params.status || "";

  const where: Record<string, unknown> = {};
  if (statusFilter) where.status = statusFilter;

  const teachers = await prisma.teacher.findMany({
    where: {
      ...where,
      ...(q ? { user: { name: { contains: q } } } : {}),
    },
    include: { user: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-dark">講師一覧</h1>
        <Link
          href="/teachers/new/edit"
          className="bg-primary text-white px-4 py-2 rounded-md text-sm hover:bg-primary-dark"
        >
          新規登録
        </Link>
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
          <option value="active">稼働中</option>
          <option value="inactive">非稼働</option>
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
              <th className="px-6 py-3 text-left text-xs font-medium text-dark/60 uppercase">担当科目</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-dark/60 uppercase">雇用形態</th>

              <th className="px-6 py-3 text-left text-xs font-medium text-dark/60 uppercase">ステータス</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {teachers.map((teacher) => {
              const subjects = JSON.parse(teacher.subjects) as string[];
              return (
                <ClickableRow key={teacher.id} href={`/teachers/${teacher.id}`} className="hover:bg-surface">
                  <td className="px-6 py-4 text-sm text-primary font-medium">
                    {teacher.user.name}
                  </td>
                  <td className="px-6 py-4 text-sm text-dark">{subjects.join(", ")}</td>
                  <td className="px-6 py-4 text-sm text-dark">
                    {teacher.employmentType === "full_time" ? "常勤" : "非常勤"}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        teacher.status === "active"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {teacher.status === "active" ? "稼働中" : "非稼働"}
                    </span>
                  </td>
                </ClickableRow>
              );
            })}
            {teachers.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-dark/60">
                  講師が見つかりません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
