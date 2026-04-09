import { requireAuth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function RoutinesPage({
  searchParams,
}: {
  searchParams: Promise<{ teacherId?: string }>;
}) {
  await requireAuth(["admin", "teacher"]);
  const params = await searchParams;
  const teacherFilter = params.teacherId || "";

  const where: Record<string, unknown> = {};
  if (teacherFilter) where.teacherId = teacherFilter;

  const routines = await prisma.routineTask.findMany({
    where,
    include: {
      teacher: { include: { user: true } },
      student: { include: { user: true } },
    },
    orderBy: [{ teacher: { user: { name: "asc" } } }, { createdAt: "desc" }],
  });

  const teachers = await prisma.teacher.findMany({
    where: { status: "active" },
    include: { user: true },
    orderBy: { user: { name: "asc" } },
  });

  // 講師ごとにグループ化
  const grouped = new Map<string, { name: string; routines: typeof routines }>();
  for (const r of routines) {
    if (!grouped.has(r.teacherId)) {
      grouped.set(r.teacherId, { name: r.teacher.user.name, routines: [] });
    }
    grouped.get(r.teacherId)!.routines.push(r);
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-dark">ルーティンタスク管理</h1>
        <Link
          href="/tasks"
          className="text-sm text-primary hover:underline"
        >
          ← タスク一覧に戻る
        </Link>
      </div>

      <p className="text-sm text-dark/60 mb-4">
        ※ 編集・追加は各講師の詳細ページから行ってください
      </p>

      <form className="bg-white p-4 rounded-lg shadow mb-6 flex gap-4 flex-wrap">
        <select
          name="teacherId"
          defaultValue={teacherFilter}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm"
        >
          <option value="">全講師</option>
          {teachers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.user.name}
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

      {grouped.size === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-dark/60">
          ルーティンタスクが登録されていません
        </div>
      ) : (
        <div className="space-y-6">
          {Array.from(grouped.entries()).map(([teacherId, group]) => (
            <div key={teacherId} className="bg-white rounded-lg shadow overflow-x-auto">
              <div className="bg-surface px-6 py-3 border-b flex justify-between items-center">
                <h2 className="font-medium text-dark">{group.name}</h2>
                <Link
                  href={`/teachers/${teacherId}`}
                  className="text-xs text-primary hover:underline"
                >
                  講師詳細を開く →
                </Link>
              </div>
              <div className="divide-y divide-gray-200">
                {group.routines.map((r) => (
                  <div key={r.id} className="px-6 py-3 flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-primary-light text-primary font-medium">
                          {r.type}
                        </span>
                        <span className="text-xs text-dark/60">[{r.subject}]</span>
                        <span className="text-sm font-medium text-dark">{r.title}</span>
                      </div>
                      {r.student && (
                        <p className="text-xs text-dark/60 mt-1">
                          対象生徒: {r.student.user.name}
                        </p>
                      )}
                      {r.description && (
                        <p className="text-xs text-dark/50 mt-1">{r.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
