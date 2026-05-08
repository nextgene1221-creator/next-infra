import { requireAuth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import MyGoalsClient, { type BigGoalView, type WeeklyGoalView } from "./MyGoalsClient";

export default async function MyGoalsPage() {
  const session = await requireAuth(["student"]);

  const student = await prisma.student.findFirst({
    where: { userId: session.user.id },
    include: {
      bigGoals: {
        include: {
          weeklyGoals: {
            orderBy: { dueDate: "asc" },
            include: { progressRecords: { select: { pagesCompleted: true } } },
          },
        },
        orderBy: { dueDate: "asc" },
      },
    },
  });

  if (!student) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-dark mb-6">目標管理</h1>
        <p className="text-dark/70">生徒情報が見つかりません。運営にお問い合わせください。</p>
      </div>
    );
  }

  const bigGoals: BigGoalView[] = student.bigGoals.map((b) => {
    const weeklyGoals: WeeklyGoalView[] = b.weeklyGoals.map((w) => ({
      id: w.id,
      bigGoalId: w.bigGoalId,
      subject: w.subject,
      materialName: w.materialName,
      targetPages: w.targetPages,
      startDate: w.startDate ? w.startDate.toISOString() : null,
      dueDate: w.dueDate.toISOString(),
      status: w.status,
      notes: w.notes,
      createdById: w.createdById,
      done: w.progressRecords.reduce((s, r) => s + r.pagesCompleted, 0),
    }));
    return {
      id: b.id,
      subject: b.subject,
      materialName: b.materialName,
      targetPages: b.targetPages,
      startDate: b.startDate.toISOString(),
      dueDate: b.dueDate.toISOString(),
      status: b.status,
      notes: b.notes,
      createdById: b.createdById,
      weeklyGoals,
    };
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-dark mb-6">目標管理</h1>
      <p className="text-sm text-dark/60 mb-4">
        ※ 自分が作成した目標のみ編集・削除できます。講師・運営が作成したものは閲覧のみ可能です。
      </p>
      <MyGoalsClient userId={session.user.id} initialBigGoals={bigGoals} />
    </div>
  );
}
