import { requireAuth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import ClickableRow from "@/components/ClickableRow";

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; subject?: string; teacherId?: string; type?: string }>;
}) {
  const session = await requireAuth(["admin", "teacher"]);
  const params = await searchParams;
  const statusFilter = params.status || "";
  const subjectFilter = params.subject || "";
  const teacherFilter = params.teacherId || "";
  const typeFilter = params.type || "";

  const where: Record<string, unknown> = {};
  if (statusFilter) where.status = statusFilter;
  if (subjectFilter) where.subject = subjectFilter;
  if (typeFilter) where.type = typeFilter;

  // 講師ロール: 自身のタスクのみ
  if (session.user.role === "teacher") {
    const teacher = await prisma.teacher.findFirst({ where: { userId: session.user.id } });
    if (teacher) where.teacherId = teacher.id;
  } else if (teacherFilter) {
    // 管理者: 担当者フィルタを適用
    where.teacherId = teacherFilter;
  }

  const tasks = await prisma.task.findMany({
    where,
    include: {
      student: { include: { user: true } },
      teacher: { include: { user: true } },
    },
    orderBy: { dueDate: "asc" },
    take: 50,
  });

  // 管理者向けの講師ドロップダウン用リスト
  const teachers =
    session.user.role === "admin"
      ? await prisma.teacher.findMany({
          where: { status: "active" },
          include: { user: true },
          orderBy: { user: { name: "asc" } },
        })
      : [];

  const statusLabel = (s: string) =>
    s === "pending" ? "未着手" : s === "in_progress" ? "進行中" : s === "completed" ? "完了" : "期限超過";
  const statusClass = (s: string) =>
    s === "completed"
      ? "bg-green-100 text-green-800"
      : s === "overdue"
      ? "bg-red-100 text-red-800"
      : s === "in_progress"
      ? "bg-blue-100 text-blue-800"
      : "bg-yellow-100 text-yellow-800";

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-dark">タスク一覧</h1>
        <div className="flex gap-2">
          <Link
            href="/tasks/routines"
            className="bg-charcoal text-white px-4 py-2 rounded-md text-sm hover:bg-dark"
          >
            ルーティン管理
          </Link>
          <Link
            href="/tasks/new/edit"
            className="bg-primary text-white px-4 py-2 rounded-md text-sm hover:bg-primary-dark"
          >
            新規作成
          </Link>
        </div>
      </div>

      <form className="bg-white p-4 rounded-lg shadow mb-6 flex gap-4 flex-wrap">
        {session.user.role === "admin" && (
          <select
            name="teacherId"
            defaultValue={teacherFilter}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="">全担当者</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.user.name}
              </option>
            ))}
          </select>
        )}
        <select
          name="type"
          defaultValue={typeFilter}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm"
        >
          <option value="">全種別</option>
          <option value="通常">通常</option>
          <option value="要引き継ぎ">要引き継ぎ</option>
          <option value="面談">面談</option>
        </select>
        <select
          name="status"
          defaultValue={statusFilter}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm"
        >
          <option value="">全ステータス</option>
          <option value="pending">未着手</option>
          <option value="in_progress">進行中</option>
          <option value="completed">完了</option>
          <option value="overdue">期限超過</option>
        </select>
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
              <th className="px-6 py-3 text-left text-xs font-medium text-dark/60 uppercase">種別</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-dark/60 uppercase">タスク名</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-dark/60 uppercase">科目</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-dark/60 uppercase">生徒</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-dark/60 uppercase">担当者</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-dark/60 uppercase">期限</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-dark/60 uppercase">ステータス</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-dark/60 uppercase">操作</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {tasks.map((task) => (
              <ClickableRow key={task.id} href={`/tasks/${task.id}/edit`} className="hover:bg-surface">
                <td className="px-6 py-4 text-sm">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      task.type === "面談"
                        ? "bg-purple-100 text-purple-800"
                        : task.type === "要引き継ぎ"
                        ? "bg-orange-100 text-orange-800"
                        : "bg-primary-light text-primary"
                    }`}
                  >
                    {task.type}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm font-medium text-primary">{task.title}</td>
                <td className="px-6 py-4 text-sm text-dark">{task.subject}</td>
                <td className="px-6 py-4 text-sm text-dark">{task.student?.user.name || "-"}</td>
                <td className="px-6 py-4 text-sm text-dark">{task.teacher.user.name}</td>
                <td className="px-6 py-4 text-sm text-dark">
                  {new Date(task.dueDate).toLocaleDateString("ja-JP")}
                </td>
                <td className="px-6 py-4 text-sm">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusClass(task.status)}`}>
                    {statusLabel(task.status)}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-primary">編集</td>
              </ClickableRow>
            ))}
            {tasks.length === 0 && (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center text-dark/60">
                  タスクがありません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
