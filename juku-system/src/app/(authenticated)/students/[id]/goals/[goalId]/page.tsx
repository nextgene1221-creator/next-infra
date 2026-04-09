import { requireAuth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function GoalDetailPage({
  params,
}: {
  params: Promise<{ id: string; goalId: string }>;
}) {
  await requireAuth(["admin", "teacher"]);
  const { id: studentId, goalId } = await params;

  const goal = await prisma.learningGoal.findUnique({
    where: { id: goalId },
    include: {
      student: { include: { user: true } },
      progressRecords: {
        include: { teacher: { include: { user: true } } },
        orderBy: { date: "desc" },
      },
    },
  });

  if (!goal || goal.studentId !== studentId) notFound();

  const completedPages = goal.progressRecords.reduce(
    (sum, r) => sum + r.pagesCompleted,
    0
  );
  const percent =
    goal.targetPages > 0
      ? Math.min(Math.round((completedPages / goal.targetPages) * 100), 100)
      : 0;
  const isOverdue = goal.status !== "completed" && new Date(goal.dueDate) < new Date();

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <Link
            href={`/students/${studentId}`}
            className="text-sm text-primary hover:underline"
          >
            ← {goal.student.user.name}の生徒詳細に戻る
          </Link>
          <h1 className="text-2xl font-bold text-dark mt-2">
            [{goal.subject}] {goal.materialName}
          </h1>
        </div>
      </div>

      {/* 目標情報カード */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">目標情報</h2>
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex">
            <dt className="w-32 text-sm text-dark/60">科目</dt>
            <dd className="text-sm text-dark">{goal.subject}</dd>
          </div>
          <div className="flex">
            <dt className="w-32 text-sm text-dark/60">教材名</dt>
            <dd className="text-sm text-dark">{goal.materialName}</dd>
          </div>
          <div className="flex">
            <dt className="w-32 text-sm text-dark/60">目標ページ数</dt>
            <dd className="text-sm text-dark">{goal.targetPages}ページ</dd>
          </div>
          <div className="flex">
            <dt className="w-32 text-sm text-dark/60">完了期限</dt>
            <dd className="text-sm text-dark">
              {new Date(goal.dueDate).toLocaleDateString("ja-JP")}
              {isOverdue && (
                <span className="ml-2 text-red-600 font-medium">期限超過</span>
              )}
            </dd>
          </div>
          <div className="flex">
            <dt className="w-32 text-sm text-dark/60">ステータス</dt>
            <dd className="text-sm text-dark">
              {goal.status === "completed" ? (
                <span className="text-green-600 font-medium">完了</span>
              ) : (
                "進行中"
              )}
            </dd>
          </div>
          {goal.notes && (
            <div className="flex md:col-span-2">
              <dt className="w-32 text-sm text-dark/60">メモ</dt>
              <dd className="text-sm text-dark">{goal.notes}</dd>
            </div>
          )}
        </dl>

        {/* プログレスバー */}
        <div className="mt-6">
          <div className="flex justify-between mb-2">
            <span className="text-sm text-charcoal">進捗</span>
            <span className="text-sm text-dark/60">
              {completedPages} / {goal.targetPages}ページ ({percent}%)
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all ${
                percent === 100
                  ? "bg-green-500"
                  : isOverdue
                  ? "bg-red-400"
                  : "bg-primary"
              }`}
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      </div>

      {/* 紐づく学習進捗一覧 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">この目標の学習進捗</h2>
        {goal.progressRecords.length === 0 ? (
          <p className="text-dark/60 text-sm">
            まだ進捗が登録されていません
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-surface">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-dark/60 uppercase">
                    授業日
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-dark/60 uppercase">
                    進めたページ数
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-dark/60 uppercase">
                    学習内容
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-dark/60 uppercase">
                    講師
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {goal.progressRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-surface">
                    <td className="px-6 py-4 text-sm text-dark">
                      <Link
                        href={`/progress/${record.id}`}
                        className="text-primary hover:underline"
                      >
                        {new Date(record.date).toLocaleDateString("ja-JP")}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-sm text-dark">
                      {record.pagesCompleted}ページ
                    </td>
                    <td className="px-6 py-4 text-sm text-dark max-w-xs">
                      <p className="line-clamp-2">{record.topic || "-"}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-dark">
                      {record.teacher.user.name}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
