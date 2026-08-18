import { requireAuth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { parseGradeLevels } from "@/lib/mockExamMaster";
import MockExamsMasterManager, { type MockExamView } from "./MockExamsMasterManager";

export const dynamic = "force-dynamic";

// 模試マスタ（新規依頼 B-7）。模試「結果」は生徒詳細の模試パネル側で扱う。
export default async function MockExamsMasterPage() {
  const session = await requireAuth(["admin", "teacher"]);

  const exams = await prisma.mockExam.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { results: true } } },
  });

  const initial: MockExamView[] = exams.map((e) => ({
    id: e.id,
    name: e.name,
    provider: e.provider,
    gradeLevels: parseGradeLevels(e.gradeLevels),
    sortOrder: e.sortOrder,
    active: e.active,
    usedCount: e._count.results,
  }));

  return (
    <div>
      <h1 className="text-2xl font-bold text-dark mb-6">模試マスタ</h1>
      <p className="text-sm text-dark/60 mb-4">
        模試結果を登録するときに選ぶ模試名を管理します。生徒ごとに名前を手入力すると表記ゆれ（「全統記述」「全統記述模試」など）で集計がずれるため、
        ここに登録したものから選ぶ運用にします。無効化した模試は新規の選択肢から外れますが、既存の記録はそのまま残ります。
      </p>
      <MockExamsMasterManager isAdmin={session.user.role === "admin"} initialExams={initial} />
    </div>
  );
}
