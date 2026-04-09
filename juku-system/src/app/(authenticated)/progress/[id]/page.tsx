import { requireAuth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function ProgressDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAuth();
  const { id } = await params;

  const record = await prisma.progressRecord.findUnique({
    where: { id },
    include: {
      student: { include: { user: true } },
      teacher: { include: { user: true } },
      goal: true,
    },
  });

  if (!record) notFound();

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-dark">進捗記録詳細</h1>
        <Link href="/progress" className="text-sm text-primary hover:underline">
          一覧に戻る
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow p-6 max-w-2xl">
        <dl className="space-y-4">
          <div className="flex">
            <dt className="w-32 text-sm text-dark/60">生徒</dt>
            <dd className="text-sm text-dark">
              <Link href={`/students/${record.student.id}`} className="text-primary hover:underline">
                {record.student.user.name}
              </Link>
            </dd>
          </div>
          <div className="flex">
            <dt className="w-32 text-sm text-dark/60">講師</dt>
            <dd className="text-sm text-dark">{record.teacher.user.name}</dd>
          </div>
          <div className="flex">
            <dt className="w-32 text-sm text-dark/60">科目</dt>
            <dd className="text-sm text-dark">{record.subject}</dd>
          </div>
          <div className="flex">
            <dt className="w-32 text-sm text-dark/60">授業日</dt>
            <dd className="text-sm text-dark">
              {new Date(record.date).toLocaleDateString("ja-JP")}
            </dd>
          </div>
          <div className="flex">
            <dt className="w-32 text-sm text-dark/60">教材</dt>
            <dd className="text-sm text-dark">{record.material}</dd>
          </div>
          <div className="flex">
            <dt className="w-32 text-sm text-dark/60">進めたページ数</dt>
            <dd className="text-sm text-dark">{record.pagesCompleted}ページ</dd>
          </div>
          {record.topic && (
            <div className="flex">
              <dt className="w-32 text-sm text-dark/60">学習内容</dt>
              <dd className="text-sm text-dark whitespace-pre-wrap">{record.topic}</dd>
            </div>
          )}
          {record.goal && (
            <div className="flex">
              <dt className="w-32 text-sm text-dark/60">紐づく目標</dt>
              <dd className="text-sm text-dark">
                <Link
                  href={`/students/${record.student.id}/goals/${record.goal.id}`}
                  className="text-primary hover:underline"
                >
                  [{record.goal.subject}] {record.goal.materialName}
                </Link>
              </dd>
            </div>
          )}
        </dl>
      </div>
    </div>
  );
}
